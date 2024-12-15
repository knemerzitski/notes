import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { evictOpenedNote } from '../models/note/evict-open';

export const OpenNoteUserUnsubscribedEvent = mutationDefinition(
  gql(`
  fragment OpenNoteUserUnsubscribedEvent on OpenNoteUserUnsubscribedEvent {
    publicUserNoteLink {
      id
      open {
        closedAt
      }
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    evictOpenedNote(data.publicUserNoteLink.id, cache);
  }
);
