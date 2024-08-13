import type { NotePatchResolvers } from './../../types.generated';

export const NotePatch: Pick<
  NotePatchResolvers,
  'categoryName' | 'deletedAt' | 'id' | 'location' | 'preferences' | 'textFields'
> = {
  id: (parent) => {
    return parent.id();
  },
  categoryName: (parent) => {
    return parent.categoryName?.();
  },
  textFields: (parent) => {
    return parent.textFields?.();
  },
  preferences: (parent, _arg, _ctx) => {
    return parent.preferences?.();
  },
  location: async (parent) => {
    return parent.location?.();
  },
  deletedAt: (parent) => {
    return parent.deletedAt?.();
  },
};
