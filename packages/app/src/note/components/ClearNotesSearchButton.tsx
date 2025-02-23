import { gql, useApolloClient } from '@apollo/client';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Box, Button, ButtonProps, css, styled } from '@mui/material';

import { forwardRef } from 'react';

import { useUserId } from '../../user/context/user-id';

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

export const ClearNotesSearchButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    searchText: string;
  }
>(function ClearNotesSearchButton({ searchText, ...restProps }, ref) {
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
