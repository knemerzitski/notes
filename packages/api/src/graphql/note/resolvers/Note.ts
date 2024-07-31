import { NoteCategory, type NoteResolvers } from '../../../graphql/types.generated';

export const Note: Pick<
  NoteResolvers,
  | 'categoryName'
  | 'contentId'
  | 'id'
  | 'isOwner'
  | 'preferences'
  | 'readOnly'
  | 'textFields'
> = {
  id: (parent) => {
    return parent.id();
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
  contentId: (parent) => {
    return parent.contentId();
  },
  isOwner: async (parent) => {
    return parent.isOwner();
  },
  categoryName: async (parent) => {
    return (await parent.categoryName()) ?? NoteCategory.DEFAULT;
  },
};
