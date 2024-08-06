import type { NotePatchResolvers } from './../../types.generated';

export const NotePatch: Pick<NotePatchResolvers, 'sharing'> = {
  sharing: (parent) => {
    return parent.sharing();
  },
};
