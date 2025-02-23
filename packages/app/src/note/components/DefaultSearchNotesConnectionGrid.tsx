import { gql } from '@apollo/client';

import { SearchNotesConnectionGrid } from './SearchNotesConnectionGrid';
import { SearchLocalNotes } from './SearchLocalNotes';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { css, Stack, styled, Switch, Typography } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';

const _DefaultSearchNotesConnectionGrid_UserFragment = gql(`
  fragment DefaultSearchNotesConnectionGrid_UserFragment on User { 
    id
    search_UserNoteLinkConnection: noteLinkSearchConnection(searchText: $searchText, first: $first, after: $after) {
      ...NotesConnectionGrid_UserNoteLinkConnectionFragment
    }
  }
`);

export function DefaultSearchNotesConnectionGrid(
  props: Parameters<typeof SearchNotesConnectionGrid>[0] &
    Parameters<typeof SearchLocalNotes>[0] & {
      offline?: boolean;
    }
) {
  const searchOffline = props.offline ?? false;

  const navigate = useNavigate();
  const isLocalOnlyUser = useIsLocalOnlyUser();

  const canSearchOnline = !isLocalOnlyUser;

  // TODO move routing otuside this
  // toggle by sending it to parent
  function handleToggleSearch() {
    void navigate({
      to: '/search',
      search: (prev) => ({
        ...prev,
        offline: !searchOffline ? true : undefined,
      }),
    });
  }

  return (
    <>
      {canSearchOnline && (
        <SwitchStack direction="row" alignContent="flex-end" width="100%">
          <Typography>
            {searchOffline ? 'Searching offline' : 'Searching online'}
          </Typography>
          <Switch
            aria-label={searchOffline ? 'search offline notes' : 'search online notes'}
            checked={!searchOffline}
            onChange={handleToggleSearch}
          />
        </SwitchStack>
      )}
      {searchOffline ? (
        <SearchLocalNotes {...props} />
      ) : (
        <SearchNotesConnectionGrid {...props} />
      )}
    </>
  );
}

const SwitchStack = styled(Stack)(
  ({ theme }) => css`
    margin-bottom: ${theme.spacing(2)};
    align-items: center;
    justify-content: flex-end;
  `
);
