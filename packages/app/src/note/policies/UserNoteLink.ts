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
      connectionCategoryName(existing = null) {
        return existing;
      },
      deletedAt: DateTimeNullable,
      create(existing = null) {
        return existing;
      },
      excludeFromConnection(existing = false) {
        return existing;
      },
      pendingStatus(existing = null) {
        return existing;
      },
    },
  };
};
