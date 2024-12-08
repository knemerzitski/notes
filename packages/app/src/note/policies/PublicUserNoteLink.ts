import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const PublicUserNoteLink: CreateTypePolicyFn = function (
  _ctx: TypePoliciesContext
) {
  return {
    fields: {
      open: {
        read(existing = null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        },
        merge: true,
      },
    },
  };
};
