import type { NotePatchResolvers } from './../../types.generated';

export const NotePatch: Pick<
  NotePatchResolvers,
  | 'categoryName'
  | 'deletedAt'
  | 'id'
  | 'location'
  | 'preferences'
  | 'textFields'
  | 'users'
  | 'usersDeleted'
> = {};
