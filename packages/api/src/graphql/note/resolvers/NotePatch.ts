import type { NotePatchResolvers } from '../../../graphql/types.generated';

export const NotePatch: Pick<
  NotePatchResolvers,
  'categoryName' | 'id' | 'preferences' | 'textFields'
> = {
  id: (parent) => {
    return parent.id();
  },
};
