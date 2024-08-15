import { NoteCategory, type NoteResolvers } from '../../../graphql/types.generated';

export const Note: Pick<
  NoteResolvers,
  | 'categoryName'
  | 'createdAt'
  | 'deletedAt'
  | 'id'
  | 'noteId'
  | 'preferences'
  | 'readOnly'
  | 'textFields'
  | 'users'
> = {
  id: (parent) => {
    return parent.id();
  },
  noteId: (parent) => {
    return parent.noteId();
  },
  preferences: (parent) => {
    return parent.preferences();
  },
  readOnly: (parent) => {
    return parent.readOnly();
  },
  textFields: (parent, args) => {
    return parent.textFields(args);
  },
  createdAt: (parent) => {
    return parent.createdAt();
  },
  categoryName: async (parent) => {
    return (await parent.categoryName()) ?? NoteCategory.DEFAULT;
  },
  deletedAt: (parent) => {
    return parent.deletedAt();
  },
  users: (parent, _args, ctx, info) => {
    return parent.users(ctx, info);
  },
};
