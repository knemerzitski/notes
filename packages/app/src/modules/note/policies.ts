import { NormalizedCacheObject, TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';
import { allActiveNotes as Query_allActiveNotes } from './policies/Query/allActiveNotes';
import { note as Query_note } from './policies/Query/note';
import { id as Note_id } from './policies/Note/id';
import { isOwner as Note_isOwner } from './policies/Note/isOwner';
import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../auth/user';
import { KeySpecifierName } from '../apollo-client/key-specifier';
import { removeActiveNotesByReference } from './active-notes';

const notePolicies: TypePolicies & EvictTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      allActiveNotes: Query_allActiveNotes,
      note: Query_note,
      notesConnection: {
        evict: {
          tag: EvictTag.UserSpecific,
        },
        ...relayStylePagination(
          () =>
            `notesConnection:${JSON.stringify({
              [KeySpecifierName.UserId]: getCurrentUserIdInStorage(),
            })}`
        ),
      },
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    keyFields: (_object, { readField }) => {
      return `Note:${JSON.stringify({
        contentId: readField('contentId'),
        [KeySpecifierName.UserId]: getCurrentUserIdInStorage(),
      })}`;
    },
    fields: {
      id: Note_id,
      textFields: fieldArrayToMap('key', {
        argName: 'name',
      }),
      isOwner: Note_isOwner,
    },
    evict: {
      evicted(objects) {
        removeActiveNotesByReference(objects.map(({ ref }) => ref));
      },
    },
  },
  NotePatch: {
    keyFields: false,
  },
};

export default notePolicies;
