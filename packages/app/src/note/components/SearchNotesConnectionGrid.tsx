import { useApolloClient, useQuery } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Alert, Box, Button, css, styled } from '@mui/material';
import { ReactNode, useMemo, useState } from 'react';

import { getFragmentData, gql, makeFragmentData } from '../../__generated__';
import { Maybe } from '../../__generated__/graphql';
import { IsDevToolsEnabled } from '../../dev/components/IsDevToolsEnabled';
import { useUserId } from '../../user/context/user-id';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useIsLoading } from '../../utils/context/is-loading';
import { NoteIdsProvider } from '../context/note-ids';

import { LoadMoreButton } from './LoadMoreButton';
import { NotesCardGrid } from './NotesCardGrid';

const SearchNotesConnectionGrid_UserNoteLinkConnectionFragment = gql(`
  fragment SearchNotesConnectionGrid_UserNoteLinkConnectionFragment on UserNoteLinkConnection {
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

const SearchNotesConnectionGrid_Query = gql(`
  query SearchNotesConnectionGrid_Query($userBy: UserByInput!, $searchText: String!, $first: NonNegativeInt, $after: String) {
    signedInUser(by: $userBy) {
      id
      noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...SearchNotesConnectionGrid_UserNoteLinkConnectionFragment
      }  
    }
  }
`);

export function SearchNotesConnectionGrid({
  searchText,
  perPageCount = 20,
  emptyElement = 'empty',
  loadingElement,
}: {
  searchText?: string;
  /**
   * @default 20
   */
  perPageCount?: Maybe<number>;
  /**
   * Element that is rendered when notes list is empty.
   */
  emptyElement?: ReactNode;
  /**
   * Element that is rendered when loading notes.
   */
  loadingElement?: ReactNode;
}) {
  const userId = useUserId();
  const isLoading = useIsLoading();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const { data, error, fetchMore } = useQuery(SearchNotesConnectionGrid_Query, {
    variables: {
      userBy: {
        id: userId,
      },
      first: perPageCount,
      searchText: searchText ?? '',
    },
    fetchPolicy: isLoading ? 'standby' : 'cache-only',
  });

  const fragmentData = getFragmentData(
    SearchNotesConnectionGrid_UserNoteLinkConnectionFragment,
    data?.signedInUser.noteLinkSearchConnection
  );

  const noteIds = useMemo(
    () =>
      fragmentData?.edges
        .map((edge) => edge.node)
        .filter((noteLink) => !noteLink.excludeFromConnection)
        .map((edge) => edge.note.id),
    [fragmentData?.edges]
  );

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (!noteIds) {
    return loadingElement ?? <NotesCardGrid />;
  }

  if (noteIds.length === 0 && emptyElement) {
    return emptyElement;
  }

  async function safeFetchMore() {
    if (isFetchingMore) {
      return;
    }

    if (!fragmentData) {
      return;
    }

    const pageInfo = fragmentData.pageInfo;

    setIsFetchingMore(true);
    try {
      await fetchMore({
        // pass this to parent, which in turn will give props for later?
        variables: {
          first: perPageCount,
          after: pageInfo.endCursor,
          searchText,
        },
      });
    } finally {
      setIsFetchingMore(false);
    }
  }

  function handleClickLoadMore() {
    void safeFetchMore();
  }

  const canFetchMore =
    !isLocalOnlyUser &&
    fragmentData?.pageInfo.hasNextPage &&
    fragmentData.pageInfo.endCursor != null;

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <RootBoxStyled>
        <DevClearListButton searchText={searchText ?? ''} />
        <NotesCardGrid />
        {canFetchMore && (
          <LoadMoreButtonStyled isLoading={isFetchingMore} onLoad={handleClickLoadMore} />
        )}
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
              SearchNotesConnectionGrid_UserNoteLinkConnectionFragment
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

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: column nowrap;
    gap: ${theme.spacing(3)};
  `
);

const LoadMoreButtonStyled = styled(LoadMoreButton)(css`
  align-self: center;
`);
