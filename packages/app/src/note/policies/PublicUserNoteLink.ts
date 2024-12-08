import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const PublicUserNoteLink: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {
      open: {
        read(existing = null) {
          return existing;
        },
        merge: true,
      },
    },
  };
};
