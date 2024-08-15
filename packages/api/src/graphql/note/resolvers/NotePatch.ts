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
  usersDeleted: async (parent) => {
    return parent.usersDeleted?.();
  },
  users: ({ users }, _arg, _ctx) => {
    /* NotePatch.users resolver is required because NotePatch.users and NotePatchMapper.users are not compatible */
    return users;
  },
};
