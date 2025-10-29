import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const UserProfile: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      avatarColor(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
