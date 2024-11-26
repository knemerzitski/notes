import { useApolloClient, useQuery } from '@apollo/client';
import { useEffect } from 'react';

import { CollabService } from '~collab/client/collab-service';
import { gql } from '../../__generated__';
import { addUnsavedNote } from '../models/unsaved-notes/add';
import { removeUnsavedNote } from '../models/unsaved-notes/remove';
import { useUserNoteLinkId } from '../context/user-note-link-id';

// TODO fragment for for loader

const ServiceUnsavedNoteTracker_query = gql(`
  query ServiceUnsavedNoteTracker_query($by: UserNoteLinkByInput!) {
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

export function ServiceUnsavedNoteTracker() {
  const client = useApolloClient();
  const userNoteLinkId = useUserNoteLinkId();
  const { data } = useQuery(ServiceUnsavedNoteTracker_query, {
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
      if (!isServiceUpToDate(service)) {
        addUnsavedNote(
          {
            userNoteLinkId,
          },
          client.cache
        );
      } else {
        removeUnsavedNote(
          {
            userNoteLinkId,
          },
          client.cache
        );
      }
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
