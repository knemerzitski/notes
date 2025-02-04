import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { setOpenedNoteActive } from '../models/opened-note/set-active';

export const OpenNoteUserUnsubscribedEvent = mutationDefinition(
  gql(`
  fragment OpenNoteUserUnsubscribedEvent on OpenNoteUserUnsubscribedEvent {
    userNoteLink {
      id
    }
  }
`),
  (cache, { data }) => {
    if (!data) {
      return;
    }

    setOpenedNoteActive(data.userNoteLink.id, false, cache);
  }
);
