import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { CollabService } from '../../../../collab2/src';

import { useUserNoteLinkId } from '../context/user-note-link-id';
import { useCollabService } from '../hooks/useCollabService';
import { updateUnsavedCollabService } from '../models/update-unsaved-collab-service';

function isServiceUpToDate(service: CollabService) {
  return !service.haveChanges();
}

export function UnsavedCollabServiceTracker() {
  const client = useApolloClient();
  const userNoteLinkId = useUserNoteLinkId();
  const maybeService = useCollabService(true);

  useEffect(() => {
    if (!maybeService) {
      return;
    }
    const service = maybeService;

    function update() {
      updateUnsavedCollabService(
        {
          userNoteLinkId,
        },
        isServiceUpToDate(service),
        client.cache
      );
    }

    update();
    const eventBusOff = service.on(
      ['view:changed', 'submittedChanges:acknowledged', 'headRecord:reset'],
      update
    );

    return () => {
      eventBusOff();
      update();
    };
  }, [maybeService, client, userNoteLinkId]);

  return null;
}
