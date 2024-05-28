import { TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';
import { allActiveNotes as Query_allActiveNotes } from './policies/Query/allActiveNotes';
import { note as Query_note } from './policies/Query/note';
import { id as Note_id } from './policies/Note/id';
import { isOwner as Note_isOwner } from './policies/Note/isOwner';
import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';
import customKeyArgsFn from '../apollo-client/utils/customKeyArgsFn';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../auth/user';
import { KeyArguments } from '../apollo-client/key-args';

const notePolicies: TypePolicies & EvictTypePolicies = {
  Query: {
    fields: {
      allActiveNotes: Query_allActiveNotes,
      note: Query_note,
      notesConnection: {
        evictTag: EvictTag.UserSpecific,
        ...relayStylePagination(
          customKeyArgsFn({
            customArgsFnMap: {
              [KeyArguments.UserId]: () => getCurrentUserIdInStorage(),
            },
          })
        ),
      },
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    fields: {
      id: Note_id,
      textFields: fieldArrayToMap('key', {
        argName: 'name',
      }),
      isOwner: Note_isOwner,
    },
  },
  NotePatch: {
    keyFields: false,
  },
};

export default notePolicies;
