import { allActiveCollabTexts as Query_allActiveCollabTexts } from './policies/Query/allActiveCollabTexts';
import { viewText as CollabText_viewText } from './policies/CollabText/viewText';
import { TypePolicies } from '@apollo/client';
import { TypePersistors } from '../apollo-client/persistence';
import { CollabEditor } from '~collab/client/collab-editor';
import { CollabText } from '../../__generated__/graphql';
import { editorsWithVars } from './editors-by-id';
import { textAtRevision as CollabText_textAtRevision } from './policies/CollabText/textAtRevision';
import { recordsConnection as CollabText_recordsConnection } from './policies/CollabText/recordsConnection';

export const collabTextPolicies: TypePolicies & TypePersistors = {
  Query: {
    fields: {
      allActiveCollabTexts: Query_allActiveCollabTexts,
    },
  },
  CollabText: {
    fields: {
      viewText: CollabText_viewText,
      // TODO add headText from editor?
      textAtRevision: CollabText_textAtRevision,
      recordsConnection: CollabText_recordsConnection,
    },
    persist: {
      writeAllAssign() {
        return [...editorsWithVars.all().entries()].map(([collabTextId, { editor }]) => ({
          id: collabTextId,
          __typename: 'CollabText',
          editor: editor.serialize(),
        }));
      },
      readModify(readValue: Pick<CollabText, 'id'> & Partial<{ editor: unknown }>): void {
        try {
          if (readValue.editor) {
            editorsWithVars.set(
              String(readValue.id),
              new CollabEditor(CollabEditor.parseValue(readValue.editor))
            );
          }
        } finally {
          delete readValue.editor;
        }
      },
    },
  },
  CollabTextRecord: {
    keyFields: false,
  },
  CollabTextPatch: {
    keyFields: false,
  }
};
