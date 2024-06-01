import { allActiveCollabTexts as Query_allActiveCollabTexts } from './policies/Query/allActiveCollabTexts';
import { viewText as CollabText_viewText } from './policies/CollabText/viewText';
import { TypePolicies } from '@apollo/client';
import { PersistTypePolicies } from '../apollo-client/policy/persist';
import { CollabEditor } from '~collab/client/collab-editor';
import { CollabText } from '../../__generated__/graphql';
import { textAtRevision as CollabText_textAtRevision } from './policies/CollabText/textAtRevision';
import { recordsConnection as CollabText_recordsConnection } from './policies/CollabText/recordsConnection';
import { editorsInCache } from '../editor/editors';

const collabTextPolicies: TypePolicies & PersistTypePolicies = {
  Query: {
    fields: {
      allActiveCollabTexts: Query_allActiveCollabTexts,
    },
  },
  CollabText: {
    fields: {
      viewText: CollabText_viewText,
      textAtRevision: CollabText_textAtRevision,
      recordsConnection: CollabText_recordsConnection,
    },
    persist: {
      writeAllAssign() {
        return [...editorsInCache.allByTypename('CollabText')].map(
          ({ object, editor }) => {
            return {
              id: object.id,
              __typename: 'CollabText',
              editor: editor.serialize(),
            };
          }
        );
      },
      readModify(readValue: Pick<CollabText, 'id'> & Partial<{ editor: unknown }>): void {
        try {
          if (readValue.editor) {
            editorsInCache.set(
              {
                id: String(readValue.id),
                __typename: 'CollabText',
              },
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
  },
};

export default collabTextPolicies;
