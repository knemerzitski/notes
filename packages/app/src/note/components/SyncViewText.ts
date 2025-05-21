import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useCollabService } from '../hooks/useCollabService';
import { setViewText } from '../models/note/set-view-text';

export function SyncViewText() {
  const client = useApolloClient();
  const userNoteLinkid = useUserNoteLinkId();
  const service = useCollabService();

  useEffect(
    () =>
      service.on('view:changed', () => {
        setViewText(userNoteLinkid, service.viewText, client.cache);
      }),
    [service, client, userNoteLinkid]
  );

  return null;
}
