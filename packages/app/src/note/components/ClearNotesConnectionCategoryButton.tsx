import { gql, useApolloClient } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Box, Button, ButtonProps, css, styled } from '@mui/material';

import { forwardRef } from 'react';

import { NoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';

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

export const ClearNotesConnectionCategoryButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    category: NoteCategory;
  }
>(function ClearNotesConnectionCategoryButton({ category, ...restProps }, ref) {
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
      ref={ref}
      color="warning"
      variant="contained"
      size="small"
      {...restProps}
      onClick={handleClearList}
    >
      <BoxStyled>
        <BugReportIcon fontSize="small" />
        Dev Clear list
      </BoxStyled>
    </Button>
  );
});

const BoxStyled = styled(Box)(css`
  display: flex;
`);
