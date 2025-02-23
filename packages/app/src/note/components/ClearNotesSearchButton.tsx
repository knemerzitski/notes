import { gql, useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { useUserId } from '../../user/context/user-id';
import BugReportIcon from '@mui/icons-material/BugReport';

const ClearNotesSearchButton_Query = gql(`
  query ClearNotesSearchButton_Query($userBy: UserByInput!, $searchText: String!) {
    signedInUser(by: $userBy) {
      id
      noteLinkSearchConnection(searchText: $searchText) {
        edges {
          cursor
        }
        pageInfo {
          hasNextPage
        }
      }   
    }
  }
`);

export function ClearNotesSearchButton({ searchText }: { searchText: string }) {
  const client = useApolloClient();
  const userId = useUserId();

  function handleClearList() {
    client.cache.writeQuery({
      query: ClearNotesSearchButton_Query,
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
            edges: [],
            pageInfo: {
              __typename: 'PageInfo',
              hasNextPage: false,
            },
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
