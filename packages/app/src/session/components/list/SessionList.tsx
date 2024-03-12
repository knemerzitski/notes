import { List, ListProps } from '@mui/material';

import { ClientSession } from '../../../__generated__/graphql';

import SessionListItem from './SessionListItem';

interface SessionListProps extends ListProps {
  sessions: ClientSession[];
  selectedSession?: Pick<ClientSession, 'id'>;
}

export default function SessionList({
  sessions,
  selectedSession,
  ...restProps
}: SessionListProps) {
  return (
    <>
      <List
        disablePadding
        {...restProps}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          ...restProps.sx,
        }}
      >
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            divider
            disablePadding
            sx={{
              alignItems: 'stretch',
              ...(session.id === selectedSession?.id && {
                backgroundColor: 'action.selected',
              }),
            }}
          />
        ))}
      </List>
    </>
  );
}
