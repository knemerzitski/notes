import { useApolloClient, useQuery } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Alert, Box, Button, css, styled } from '@mui/material';
import {
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Maybe } from '~utils/types';

import { getFragmentData, gql, makeFragmentData } from '../../__generated__';
import { Note, NoteCategory } from '../../__generated__/graphql';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import { useUserId } from '../../user/context/user-id';
import { useIsLoading } from '../../utils/context/is-loading';
import { useLogger } from '../../utils/context/logger';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { NoteIdsProvider } from '../context/note-ids';
import { removeNoteFromConnection } from '../models/note-connection/remove';
import { toMovableNoteCategory } from '../utils/note-category';

import { NoteCard } from './NoteCard';
import { NotesCardGrid } from './NotesCardGrid';
import { SortableNoteCard } from './SortableNoteCard';
import { SortableNotesContext } from './SortableNotesContext';

const NotesConnectionGrid_UserNoteLinkConnectionFragment = gql(`
  fragment NotesConnectionGrid_UserNoteLinkConnectionFragment on UserNoteLinkConnection {
    edges {
      node {
        id
        note {
          id
        }
        excludeFromConnection @client
        categoryName
        ...NotesCardGrid_UserNoteLinkFragment
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }    
  }
`);

const NotesConnectionGrid_Query = gql(`
  query NotesConnectionGrid_Query($userBy: UserByInput!, $first: NonNegativeInt, $after: ObjectID, $category: NoteCategory) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(first: $first, after: $after, category: $category) {
        ...NotesConnectionGrid_UserNoteLinkConnectionFragment
      }   
    }
  }
`);

// TODO reuse logic in NotesSearchConnection

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY_LIST: readonly any[] = [];

export function NotesConnectionGrid({
  perPageCount,
  category = NoteCategory.DEFAULT,
  emptyElement = 'empty',
  infiniteLoadingDelay = 500,
}: {
  /**
   * @default 20
   */
  perPageCount?: Maybe<number>;
  /**
   * @default Default
   */
  category?: NoteCategory;
  /**
   * Element that is rendered when notes list is empty.
   */
  emptyElement?: ReactNode;
  /**
   * Wait time beween fetching more notes during infinite scrolling
   * @default 500 milliseconds
   */
  infiniteLoadingDelay?: number;
}) {
  const definedPerPageCount = perPageCount ?? 20;

  const logger = useLogger('NotesConnectionGrid');

  const client = useApolloClient();
  const isParentLoading = useIsLoading();
  const userId = useUserId();
  const isOnline = useIsOnline();

  const [isFetching, setIsFetching] = useState(false);

  const fetchMoreStateRef = useRef<{
    bind: {
      userId: string;
      category: NoteCategory;
    };
    intersectedNoteIds: Set<string>;
    isFetching: boolean;
    hasRequestedMore: boolean;
    fetchMore: {
      triggerNoteId: string;
      endCursor: string | number;
    } | null;
    firstTimeTriggered: boolean;
    lastTriggerTime: number;
  }>({
    bind: {
      userId,
      category,
    },
    intersectedNoteIds: new Set(),
    isFetching: false,
    hasRequestedMore: false,
    fetchMore: null,
    firstTimeTriggered: false,
    lastTriggerTime: Date.now(),
  });

  // Reset state when category or userId changed
  useEffect(() => {
    const state = fetchMoreStateRef.current;
    if (state.bind.userId === userId && state.bind.category === category) {
      return;
    }

    logger?.debug('state:reset');

    fetchMoreStateRef.current = {
      bind: {
        userId,
        category,
      },
      intersectedNoteIds: new Set(),
      isFetching: false,
      hasRequestedMore: false,
      fetchMore: null,
      firstTimeTriggered: false,
      lastTriggerTime: Date.now(),
    };
  }, [category, userId, logger]);

  const { data, error, fetchMore } = useQuery(NotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: definedPerPageCount,
      category,
    },
    fetchPolicy: 'cache-only',
  });

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkConnection
  );

  const noteIds = useMemo(() => {
    const seenIds = new Set<string>();
    return fragmentData?.edges
      .map((edge) => edge.node)
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .filter((noteLink) => {
        const isInCorrectCategory = noteLink.categoryName == category;
        if (!isInCorrectCategory) {
          logger?.debug('noteLink:removeFromWrongConnectionCategory', {
            noteLink,
            category,
          });

          removeNoteFromConnection(
            {
              userNoteLinkId: noteLink.id,
            },
            client.cache,
            category
          );

          return false;
        }
        return true;
      })
      .map((edge) => edge.note.id)
      .filter((noteId) => {
        if (seenIds.has(noteId)) {
          logger?.error('noteLink:filteredDuplicateId', {
            noteId,
          });
          return false;
        }
        return true;
      });
  }, [fragmentData?.edges, category, logger, client]);

  const safeFetchMore = useCallback(
    async function safeFetchMore() {
      const state = fetchMoreStateRef.current;

      // Have info to fetch
      if (!state.fetchMore) {
        logger?.debug('safeFetchMore:cancel.noFetchMore');
        return;
      }

      // Ensure note has been visible
      if (!state.intersectedNoteIds.has(state.fetchMore.triggerNoteId)) {
        logger?.debug('safeFetchMore:cancel.notIntersected');
        return;
      }

      if (state.isFetching) {
        logger?.debug('safeFetchMore:pending.isRequestingMore');
        state.hasRequestedMore = true;
        return;
      }

      state.isFetching = true;
      setIsFetching(true);

      const delay = Math.max(
        0,
        infiniteLoadingDelay - (Date.now() - state.lastTriggerTime)
      );
      logger?.debug('safeFetchMore:waitDelay', delay);
      await new Promise((res) => {
        setTimeout(() => {
          logger?.debug('safeFetchMore:delayElapsed');
          res(true);
        }, delay);
      });

      logger?.debug('safeFetchMore:triggered', {
        trigger: state.fetchMore.triggerNoteId,
        end: state.fetchMore.endCursor,
      });

      try {
        const { data } = await fetchMore({
          variables: {
            first: definedPerPageCount,
            after: state.fetchMore.endCursor,
            category,
          },
        });
        logger?.debug('safeFetchMore:result:clearFetchMore');
        state.lastTriggerTime = Date.now();
        state.fetchMore = null;

        const fragmentData = getFragmentData(
          NotesConnectionGrid_UserNoteLinkConnectionFragment,
          data.signedInUser.noteLinkConnection
        );

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('safeFetchMore:result:noNextPage');
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('safeFetchMore:result:noEndCursor');
          return;
        }

        const newNoteIds = fragmentData.edges
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        logger?.debug('safeFetchMore:result', { newNoteIds, nextEndCursor });

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('safeFetchMore:result:noLastNoteId');
          return;
        }

        logger?.debug('safeFetchMore:result:updateFetchMore', {
          triggerNoteId: lastNoteId,
          endCursor: nextEndCursor,
        });

        state.fetchMore = {
          triggerNoteId: lastNoteId,
          endCursor: nextEndCursor,
        };
        state.hasRequestedMore = true;
      } finally {
        setIsFetching(false);
        state.isFetching = false;

        if (state.hasRequestedMore) {
          state.hasRequestedMore = false;
          void safeFetchMore();
        }
      }
    },
    [category, definedPerPageCount, fetchMore, infiniteLoadingDelay, logger]
  );

  const handleIntersectingOnceNoteId = useCallback(
    (noteId: Note['id']) => {
      fetchMoreStateRef.current.intersectedNoteIds.add(noteId);
      logger?.debug('handleIntersectingOnceNoteId', noteId);
      void safeFetchMore();
    },
    [safeFetchMore, logger]
  );

  // Run fetchMore once after first query
  useEffect(() => {
    // Dont run first fetchMore until parent has finished loading
    if (isParentLoading) {
      logger?.debug('firstTimeFetchMore:parentStillLoading');
      return;
    }

    const state = fetchMoreStateRef.current;

    if (state.firstTimeTriggered) {
      return;
    }

    if (!data) {
      logger?.debug('firstTimeFetchMore:noData');
      return;
    }

    const fragmentData = getFragmentData(
      NotesConnectionGrid_UserNoteLinkConnectionFragment,
      data.signedInUser.noteLinkConnection
    );

    const hasNextPage = fragmentData.pageInfo.hasNextPage;
    if (!hasNextPage) {
      logger?.debug('firstTimeFetchMore:noNextPage', { fragmentData });
      return;
    }

    const nextEndCursor = fragmentData.pageInfo.endCursor;
    if (nextEndCursor == null) {
      logger?.debug('firstTimeFetchMore:noEndCursor');
      return;
    }

    // Only include notes limited by definedPerPageCount
    const newNoteIds = fragmentData.edges
      .slice(0, definedPerPageCount)
      .map((edge) => edge.node)
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .map((edge) => edge.note.id);

    logger?.debug('firstTimeFetchMore:result', { newNoteIds, nextEndCursor });

    const lastNoteId = newNoteIds[newNoteIds.length - 1];
    if (lastNoteId == null) {
      logger?.debug('firstTimeFetchMore:noLastId');
      return;
    }

    state.firstTimeTriggered = true;

    logger?.debug('firstTimeFetchMore:updateFetchMore', {
      triggerNoteId: lastNoteId,
      endCursor: nextEndCursor,
    });

    state.fetchMore = {
      triggerNoteId: lastNoteId,
      endCursor: nextEndCursor,
    };

    void safeFetchMore();
  }, [
    data,
    definedPerPageCount,
    logger,
    safeFetchMore,
    isParentLoading,
    infiniteLoadingDelay,
  ]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  function calcLoading() {
    const state = fetchMoreStateRef.current;
    if (isFetching && state.fetchMore != null && noteIds != null) {
      const triggerIndex = noteIds.indexOf(state.fetchMore.triggerNoteId);
      if (triggerIndex >= 0) {
        const startIndex = triggerIndex + 1;
        const endIndex = startIndex + definedPerPageCount;

        const result = {
          loadingCount: Math.max(0, endIndex - noteIds.length),
          loadingNoteIds: noteIds.slice(startIndex, endIndex),
        };

        logger?.debug('calcLoading:fetchMore:advanced', {
          result,
          fetchMore: { ...state.fetchMore },
          noteIds: [...noteIds],
        });

        return result;
      }
    }

    // Default loading from parent
    if (isParentLoading) {
      if (!noteIds) {
        logger?.debug('calcLoading:fromParent:simple', { definedPerPageCount });

        return {
          loadingCount: definedPerPageCount,
          loadingNoteIds: EMPTY_LIST,
        };
      }

      const startIndex = 0;
      const endIndex = startIndex + definedPerPageCount;

      const result = {
        loadingCount: Math.max(0, endIndex - noteIds.length),
        loadingNoteIds: noteIds.slice(startIndex, endIndex),
      };

      logger?.debug('calcLoading:fromParent:advanced', result);

      return result;
    }

    logger?.debug('calcLoading:default');

    return {
      loadingCount: 0,
      loadingNoteIds: EMPTY_LIST,
    };
  }

  const { loadingCount, loadingNoteIds } = calcLoading();

  const isLoadingSomething = isOnline
    ? loadingCount > 0 || loadingNoteIds.length > 0
    : false;

  if (!isLoadingSomething && noteIds != null && noteIds.length === 0 && emptyElement) {
    return emptyElement;
  }

  const isSortableCategory = !!toMovableNoteCategory(category);

  const maybeSortableNotesGrid = (
    <RootBoxStyled>
      <DevClearListButton category={category} />
      <NotesCardGrid
        loadingCount={isOnline ? loadingCount : 0}
        loadingNoteIds={isOnline ? loadingNoteIds : EMPTY_LIST}
        noteCard={
          <IntersectOnceNoteCard
            sortable={isSortableCategory}
            onIntersectingOnce={handleIntersectingOnceNoteId}
          />
        }
      />
    </RootBoxStyled>
  );

  const maybeSortableElement = isSortableCategory ? (
    <SortableNotesContext category={category}>
      {maybeSortableNotesGrid}
    </SortableNotesContext>
  ) : (
    maybeSortableNotesGrid
  );

  return (
    <NoteIdsProvider noteIds={noteIds ?? EMPTY_LIST}>
      {maybeSortableElement}
    </NoteIdsProvider>
  );
}

function DevClearListButton(props: Parameters<typeof ClearListButton>[0]) {
  return (
    <IsDevToolsEnabled>
      <ClearListButton {...props} />
    </IsDevToolsEnabled>
  );
}

function ClearListButton({ category }: { category: NoteCategory }) {
  const client = useApolloClient();
  const userId = useUserId();

  function handleClearList() {
    client.cache.writeQuery({
      query: NotesConnectionGrid_Query,
      overwrite: true,
      variables: {
        userBy: {
          id: userId,
        },
        category,
      },
      data: {
        __typename: 'Query',
        signedInUser: {
          __typename: 'User',
          id: userId,
          noteLinkConnection: {
            __typename: 'UserNoteLinkConnection',
            ...makeFragmentData(
              {
                __typename: 'UserNoteLinkConnection',
                edges: [],
                pageInfo: {
                  __typename: 'PageInfo',
                  hasNextPage: false,
                },
              },
              NotesConnectionGrid_UserNoteLinkConnectionFragment
            ),
          },
        },
      },
    });
  }

  return (
    <Button
      color="warning"
      onClick={handleClearList}
      variant="contained"
      size="small"
      sx={{
        alignSelf: 'flex-end',
      }}
    >
      <BugReportIcon fontSize="small" />
      Dev Clear list
    </Button>
  );
}

const IntersectOnceNoteCard = memo(
  forwardRef<
    HTMLDivElement,
    { sortable: boolean; onIntersectingOnce: (noteId: Note['id']) => void }
  >(function IntersectOnceNoteCard({ sortable, onIntersectingOnce }, ref) {
    const noteId = useNoteId();

    ref = useOnIntersecting(
      ref,
      () => {
        onIntersectingOnce(noteId);
      },
      {
        intersectionLimit: 1,
      }
    );

    const NoteCardComponent = sortable ? SortableNoteCard : NoteCard;

    return <NoteCardComponent ref={ref} />;
  })
);

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);
