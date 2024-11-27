import { useApolloClient, useQuery } from '@apollo/client';
import { useEffect } from 'react';

import { CollabService } from '~collab/client/collab-service';
import { gql } from '../../__generated__';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { updateUnsavedCollabService } from '../models/update-unsaved-collab-service';

// TODO fragment for for loader

const UnsavedCollabServiceTracker_Query = gql(`
  query UnsavedCollabServiceTracker_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by) @client {
      id
      note {
        id
        collabService
      }
    }
  }
`);

function isServiceUpToDate(service: CollabService) {
  return !service.haveSubmittedChanges() && !service.haveLocalChanges();
}

export function UnsavedCollabServiceTracker() {
  const client = useApolloClient();
  const userNoteLinkId = useUserNoteLinkId();
  const { data } = useQuery(UnsavedCollabServiceTracker_Query, {
    variables: {
      by: {
        userNoteLinkId,
      },
    },
  });

  const maybeService = data?.userNoteLink.note.collabService;

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

    const eventBusOff = service.eventBus.on(
      ['haveLocalChanges', 'submittedChangesAcknowledged', 'replacedHeadText'],
      update
    );

    return () => {
      eventBusOff();
      update();
    };
  }, [maybeService, client, userNoteLinkId]);

  return null;
}
