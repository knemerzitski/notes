import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { KeySpecifierName } from '../../apollo-client/key-specifier';
import { EvictTypePolicies } from '../../apollo-client/policy/evict';
import { fieldArrayToMap } from '../../apollo-client/utils/fieldArrayToMap';
import { getCurrentUserIdInStorage } from '../../auth/user';

import { removeActiveNotesByReference } from './active-notes';
import { id as Note_id } from './policies/Note/id';
import { isOwner as Note_isOwner } from './policies/Note/isOwner';
import { allActiveNotes as Query_allActiveNotes } from './policies/Query/allActiveNotes';
import { note as Query_note } from './policies/Query/note';
import { notesConnection as Query_notesConnection } from './policies/Query/notesConnection';

const notePolicies: TypePolicies & EvictTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      allActiveNotes: Query_allActiveNotes,
      note: Query_note,
      notesConnection: Query_notesConnection,
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    keyFields: (_object, { readField }) => {
      const contentId = readField('contentId');
      if (!contentId) return;

      return `Note:${JSON.stringify({
        contentId,
        [KeySpecifierName.USER_ID]: getCurrentUserIdInStorage(),
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
  NoteSharing: {
    keyFields: false,
  },
};

export default notePolicies;
