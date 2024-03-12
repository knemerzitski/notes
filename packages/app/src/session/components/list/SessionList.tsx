import { List, ListProps } from '@mui/material';

import { SavedSession } from '../../../__generated__/graphql';

import SessionListItem from './SessionListItem';

interface SessionListProps extends ListProps {
  sessions: SavedSession[];
  selectedSession?: Pick<SavedSession, 'key'>;
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
            key={session.key}
            session={session}
            divider
            disablePadding
            sx={{
              alignItems: 'stretch',
              ...(session.key === selectedSession?.key && {
                backgroundColor: 'action.selected',
              }),
            }}
          />
        ))}
      </List>
    </>
  );
}
