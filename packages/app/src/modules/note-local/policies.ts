import { NormalizedCacheObject, TypePolicies } from '@apollo/client';
import { PersistTypePolicies } from '../apollo-client/policy/persist';
import { editorsInCache } from '../editor/editors';
import { LocalCollabText } from '../../__generated__/graphql';
import { CollabEditor } from '~collab/client/collab-editor';
import { EvictTypePolicies } from '../apollo-client/policy/evict';
import { localNotesConnection as Query_localNotesConnection } from './policies/Query/localNotesConnection';

const localNotePolicies: TypePolicies &
  PersistTypePolicies &
  EvictTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      nextLocalNoteId(existing = 1) {
        return existing;
      },
      nextLocalCollabTextId(existing = 1) {
        return existing;
      },
      localNote: {
        read(_, { args, toReference }) {
          if (typeof args?.id === 'string' || typeof args?.id === 'number') {
            return toReference({
              __typename: 'LocalNote',
              id: args.id,
            });
          }

          return;
        },
        keyArgs: false,
        merge: false,
      },
      localNotesConnection: Query_localNotesConnection,
    },
  },
  LocalCollabText: {
    fields: {
      viewText: {
        read(_existing, options) {
          const { readField } = options;
          const id = readField('id');
          if (!id) {
            throw new Error('Expected LocalCollabText.id to be defined to create editor');
          }

          return editorsInCache
            .getOrCreate({
              __typename: 'LocalCollabText',
              id: String(id),
            })
            .vars.viewTextVar();
        },
      },
    },
    persist: {
      writeAllAssign() {
        return [...editorsInCache.allByTypename('LocalCollabText')].map(
          ({ object, editor }) => {
            return {
              id: object.id,
              __typename: 'LocalCollabText',
              editor: editor.serialize(),
            };
          }
        );
      },
      readModify(
        readValue: Pick<LocalCollabText, 'id'> & Partial<{ editor: unknown }>
      ): void {
        try {
          if (readValue.editor) {
            editorsInCache.set(
              {
                id: String(readValue.id),
                __typename: 'LocalCollabText',
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
};

export default localNotePolicies;
