import type { NotePatchResolvers } from './../../types.generated';

export const NotePatch: Pick<
  NotePatchResolvers,
  'categoryName' | 'id' | 'preferences' | 'textFields'
> = {
  id: (parent) => {
    return parent.id();
  },
  categoryName: (parent) => {
    return parent.categoryName();
  },
  textFields: (parent) => {
    return parent.textFields();
  },
};
