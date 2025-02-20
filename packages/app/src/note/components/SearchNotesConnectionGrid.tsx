import { useApolloClient, useQuery } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Alert, Box, Button, CircularProgress, css, styled } from '@mui/material';
import {
  ComponentType,
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { getFragmentData, gql, makeFragmentData } from '../../__generated__';
import { Note } from '../../__generated__/graphql';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import { useUserId } from '../../user/context/user-id';
import { NoteIdsProvider } from '../context/note-ids';

import { NotesCardGrid } from './NotesCardGrid';
import { useIntersectingFetchMore } from '../hooks/useIntersectingFetchMore';
import { useOnIntersecting } from '../../utils/hooks/useOnIntersecting';
import { useNoteId } from '../context/note-id';
import { NoteCard } from './NoteCard';
import { useLogger } from '../../utils/context/logger';
import { NotesConnectionGrid_UserNoteLinkConnectionFragment } from './NotesConnectionGrid';
import { SearchResultIconText } from './SearchResultIconText';
import { useIsLoading } from '../../utils/context/is-loading';
import { useIsOnline } from '../../utils/hooks/useIsOnline';
import { PassChildren } from '../../utils/components/PassChildren';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';

const SearchNotesConnectionGrid_Query = gql(`
  query SearchNotesConnectionGrid_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String, $offline: Boolean) {
    signedInUser(by: $userBy) {
      id
      noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after, extend: { offline: $offline }) @clientArgs(paths: ["extend.offline"]) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
      }
    }
  }
`);

export function SearchNotesConnectionGrid({
  fetchMoreOptions,
  searchText,
  NoListComponent = PassChildren,
}: {
  fetchMoreOptions?: Pick<
    Parameters<typeof useIntersectingFetchMore>[0],
    'infiniteLoadingDelay' | 'perPageCount'
  >;
  searchText?: string;
  /**
   * Component that is used when not rendering search result
   */
  NoListComponent?: ComponentType<{ children: ReactNode }>;
}) {
  const logger = useLogger('SearchNotesConnectionGrid');

  const userId = useUserId();
  const isOnline = useIsOnline();
  const isParentLoading = useIsLoading();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const resetRef = useRef({
    userId,
    searchText,
  });

  // TODO button toggle between offline and online results?
  const queryForOfflineResults = isLocalOnlyUser || !isOnline;

  const { data, error, fetchMore } = useQuery(SearchNotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: fetchMoreOptions?.perPageCount ?? 20,
      searchText: searchText ?? '',
      offline: queryForOfflineResults,
    },
  });

  const fragmentData = getFragmentData(
    NotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkSearchConnection
  );

  const noteIds = useMemo(() => {
    const seenIds = new Set<string>();
    return fragmentData?.edges
      .map((edge) => edge.node)
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .map((edge) => edge.note.id)
      .filter((noteId) => {
        if (seenIds.has(noteId)) {
          logger?.error('noteLink:filteredDuplicateId', {
            noteId,
          });
          return false;
        }
        seenIds.add(noteId);
        return true;
      });
  }, [fragmentData?.edges, logger]);

  const {
    loadingCount,
    onIntersectingId: onIntersectingNoteId,
    reset,
  } = useIntersectingFetchMore({
    ...fetchMoreOptions,
    ids: noteIds,
    fetchMore: useCallback(
      async ({ perPageCount, endCursor }) => {
        const { data } = await fetchMore({
          variables: {
            first: perPageCount,
            after: endCursor,
            searchText,
          },
        });

        const fragmentData = getFragmentData(
          NotesConnectionGrid_UserNoteLinkConnectionFragment,
          data.signedInUser.noteLinkSearchConnection
        );

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('fetchMore:noNextPage');
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('fetchMore:noEndCursor');
          return;
        }

        const newNoteIds = fragmentData.edges
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('fetchMore:noLastNoteId');
          return;
        }

        return {
          triggerId: lastNoteId,
          endCursor: nextEndCursor,
        };
      },
      [searchText, fetchMore, logger]
    ),
    firstFetchMore: useCallback(
      ({ perPageCount }) => {
        if (!fragmentData) {
          logger?.debug('firstFetchMore:noFragmentData');
          return;
        }

        const hasNextPage = fragmentData.pageInfo.hasNextPage;
        if (!hasNextPage) {
          logger?.debug('firstFetchMore:noNextPage', { fragmentData });
          return;
        }

        const nextEndCursor = fragmentData.pageInfo.endCursor;
        if (nextEndCursor == null) {
          logger?.debug('firstFetchMore:noEndCursor');
          return;
        }

        // Only include notes limited by definedPerPageCount
        const newNoteIds = fragmentData.edges
          .slice(0, perPageCount)
          .map((edge) => edge.node)
          .filter((noteLink) => !noteLink.excludeFromConnection)
          .map((edge) => edge.note.id);

        logger?.debug('firstTimeFetchMore:result', { newNoteIds, nextEndCursor });

        const lastNoteId = newNoteIds[newNoteIds.length - 1];
        if (lastNoteId == null) {
          logger?.debug('firstTimeFetchMore:noLastId');
          return;
        }

        return {
          triggerId: lastNoteId,
          endCursor: nextEndCursor,
        };
      },
      [logger, fragmentData]
    ),
  });

  // Reset fetchMore when searchText or userId has changed
  useEffect(() => {
    if (
      resetRef.current.userId === userId &&
      resetRef.current.searchText === searchText
    ) {
      return;
    }
    resetRef.current = {
      userId,
      searchText,
    };

    reset();
  }, [searchText, userId, reset]);

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (searchText == null || searchText === '') {
    logger?.debug('startTyping');
    return (
      <NoListComponent>
        <SearchResultIconText text="Start typing to search notes" />
      </NoListComponent>
    );
  }

  if (isOnline && isParentLoading) {
    logger?.debug('parentLoading');
    return (
      <NoListComponent>
        <CenterCircularProgress />
      </NoListComponent>
    );
  }

  if (!noteIds || noteIds.length === 0) {
    logger?.debug('noMatch');
    return (
      <NoListComponent>
        <SearchResultIconText text={'No matching notes'} />
      </NoListComponent>
    );
  }

  if (loadingCount > 0) {
    logger?.debug('loadingCount', loadingCount);
  }

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <RootBoxStyled>
        <DevClearListButton searchText={searchText} />
        <NotesCardGrid
          loadingCount={queryForOfflineResults ? 0 : loadingCount}
          noteCard={<IntersectOnceNoteCard onIntersectingOnce={onIntersectingNoteId} />}
        />
      </RootBoxStyled>
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

function ClearListButton({ searchText }: { searchText: string }) {
  const client = useApolloClient();
  const userId = useUserId();

  function handleClearList() {
    client.cache.writeQuery({
      query: SearchNotesConnectionGrid_Query,
      overwrite: true,
      variables: {
        userBy: {
          id: userId,
        },
        searchText,
      },
      data: {
        __typename: 'Query',
        signedInUser: {
          __typename: 'User',
          id: userId,
          noteLinkSearchConnection: {
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
  forwardRef<HTMLDivElement, { onIntersectingOnce: (noteId: Note['id']) => void }>(
    function IntersectOnceNoteCard({ onIntersectingOnce }, ref) {
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

      return <NoteCard ref={ref} />;
    }
  )
);

function CenterCircularProgress() {
  return (
    <BoxCenter>
      <CircularProgress />
    </BoxCenter>
  );
}

const BoxCenter = styled(Box)(css`
  justify-self: center;
`);

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);
