import { NormalizedCacheObject, TypePolicies } from '@apollo/client';
import { CollabEditor } from '~collab/client/collab-editor';

import { CollabText } from '../../__generated__/graphql';
import { EvictTypePolicies } from '../apollo-client/policy/evict';
import { PersistTypePolicies } from '../apollo-client/policy/persist';
import { editorsInCache } from '../editor/editors';

import { recordsConnection as CollabText_recordsConnection } from './policies/CollabText/recordsConnection';
import { textAtRevision as CollabText_textAtRevision } from './policies/CollabText/textAtRevision';
import { viewText as CollabText_viewText } from './policies/CollabText/viewText';
import { allActiveCollabTexts as Query_allActiveCollabTexts } from './policies/Query/allActiveCollabTexts';

const collabTextPolicies: TypePolicies &
  PersistTypePolicies &
  EvictTypePolicies<NormalizedCacheObject> = {
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
    evict: {
      evicted(objects) {
        objects.forEach((object) => {
          editorsInCache.delete(object);
        });
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
