import type { NotePatchResolvers } from '../../types.generated';

export const NotePatch: Pick<NotePatchResolvers, 'shareLink'> = {
  shareLink: (parent) => {
    return null;
  },
};
