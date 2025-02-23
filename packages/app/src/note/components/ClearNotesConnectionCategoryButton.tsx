import { gql, useApolloClient } from '@apollo/client';
import { Button } from '@mui/material';
import { NoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import BugReportIcon from '@mui/icons-material/BugReport';

const ClearNotesConnectionCategoryButton_Query = gql(`
  query ClearNotesConnectionCategoryButton_Query($userBy: UserByInput!, $category: NoteCategory) {
    signedInUser(by: $userBy) {
      id
      noteLinkConnection(category: $category) {
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

export function ClearNotesConnectionCategoryButton({
  category,
}: {
  category: NoteCategory;
}) {
  const client = useApolloClient();
  const userId = useUserId();

  function handleClearList() {
    client.cache.writeQuery({
      query: ClearNotesConnectionCategoryButton_Query,
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
