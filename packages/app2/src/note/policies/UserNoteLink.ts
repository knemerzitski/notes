import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';
import { NoteCategory } from '../../__generated__/graphql';
import { DateTimeNullable } from '../../graphql/scalars/DateTime';

export const UserNoteLink: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      categoryName(existing = NoteCategory.DEFAULT) {
        return existing;
      },
      originalCategoryName(existing = null) {
        return existing;
      },
      connectionCategoryName(existing = null, { readField }) {
        if (existing === null) {
          return readField('categoryName');
        }

        return existing;
      },
      deletedAt: DateTimeNullable,
      create(existing = null) {
        return existing;
      },
      excludeFromConnection(existing = false) {
        return existing;
      },
      createStatus(existing = null) {
        return existing;
      },
    },
  };
};
