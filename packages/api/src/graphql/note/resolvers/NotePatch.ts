import type { NotePatchResolvers } from '../../../graphql/types.generated';

export const NotePatch: NotePatchResolvers = {
  id: (parent) => {
    return parent.id();
  },
};
