import { gql } from '@apollo/client';
import { css, styled } from '@mui/material';
import { RouteSearchOnlineToggle } from './RouteSearchOnlineToggle';
import { RouteSearchNotes } from './RouteSearchNotes';

const _DefaultSearchNotesConnectionGrid_UserFragment = gql(`
  fragment DefaultSearchNotesConnectionGrid_UserFragment on User { 
    ...RouteSearchNotes_UserFragment
  }
`);

export function DefaultSearchNotesConnectionGrid(
  props: Parameters<typeof RouteSearchNotes>[0]
) {
  return (
    <>
      <RouteSearchOnlineToggleStyled />
      <RouteSearchNotes {...props} />
    </>
  );
}

const RouteSearchOnlineToggleStyled = styled(RouteSearchOnlineToggle)(
  ({ theme }) => css`
    margin-bottom: ${theme.spacing(2)};
    justify-content: flex-end;
  `
);
