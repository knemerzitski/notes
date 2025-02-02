// import { objectValueArrayPermutationsValues } from '~utils/object/object-value-array-permutations';
import { isObjectLike } from '~utils/type-guards/is-object-like';

// import { NoteCategory } from '../../__generated__/graphql';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { TaggedEvictOptionsList, EvictTag } from '../../graphql/utils/tagged-evict';
import { throwNoteNotFoundError } from '../utils/errors';

export const Query: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      note: {
        keyArgs: false,
        read(_existing, { args, toReference }) {
          // Read using NoteByInput (argument by)
          if (!args || !isObjectLike(args)) {
            throwNoteNotFoundError();
          }

          const by = args.by;
          if (!isObjectLike(by)) {
            throwNoteNotFoundError();
          }

          if (typeof by.id !== 'string') {
            throwNoteNotFoundError(String(by.id));
          }

          return toReference({
            __typename: 'Note',
            id: by.id,
          });
        },
        merge: false,
      },
    },
  };
};

const userSpecificFields: string[] = ['note'];

export const evictOptions: TaggedEvictOptionsList = [
  {
    tag: EvictTag.USER_SPECIFIC,
    options: [
      ...userSpecificFields.map((fieldName) => ({
        fieldName,
      })),
    ],
  },
];
