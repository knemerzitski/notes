import { Typography, Switch, Stack, StackProps, styled, css } from '@mui/material';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { forwardRef } from 'react';
import { useDefaultIsSearchOffline } from '../hooks/useDefaultIsSearchOffline';

export const RouteSearchOnlineToggle = forwardRef<HTMLDivElement, StackProps>(
  function RouteSearchOnlineToggle(props, ref) {
    const defaultIsSearchOffline = useDefaultIsSearchOffline();

    const { isOfflineSearch = defaultIsSearchOffline } = useSearch({
      from: '/_root_layout/search',
      select(state) {
        return {
          isOfflineSearch: state.offline,
        };
      },
    });

    const navigate = useNavigate();
    const isLocalOnlyUser = useIsLocalOnlyUser();

    const canSearchOnline = !isLocalOnlyUser;

    function handleToggleSearch() {
      void navigate({
        to: '/search',
        search: (prev) => ({
          ...prev,
          offline: prev.offline ? undefined : true,
        }),
      });
    }

    if (!canSearchOnline) {
      return null;
    }

    return (
      <StackStyled ref={ref} direction="row" {...props}>
        <Typography>
          {isOfflineSearch ? 'Searching offline' : 'Searching online'}
        </Typography>
        <Switch
          aria-label={isOfflineSearch ? 'search offline notes' : 'search online notes'}
          checked={!isOfflineSearch}
          onChange={handleToggleSearch}
        />
      </StackStyled>
    );
  }
);

const StackStyled = styled(Stack)(css`
  align-items: center;
`);
