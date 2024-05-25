import { TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';

import { allActiveNotes as Query_allActiveNotes } from './policies/Query/allActiveNotes';
import { note as Query_note } from './policies/Query/note';
import { id as Note_id } from './policies/Note/id';
import { textFields as Note_textFields } from './policies/Note/textFields';
import { isOwner as Note_isOwner } from './policies/Note/isOwner';

const notePolicies: TypePolicies = {
  Query: {
    fields: {
      allActiveNotes: Query_allActiveNotes,
      note: Query_note,
      notesConnection: relayStylePagination(),
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    fields: {
      id: Note_id,
      textFields: Note_textFields,
      isOwner: Note_isOwner,
    },
  },
  NotePatch: {
    keyFields: false,
  },
};

export default notePolicies;
