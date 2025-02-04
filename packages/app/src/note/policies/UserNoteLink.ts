import { NoteCategory } from '../../__generated__/graphql';
import { DateTimeNullable } from '../../graphql/scalars/DateTime';
import { CreateTypePolicyFn, TypePoliciesContext } from '../../graphql/types';

export const UserNoteLink: CreateTypePolicyFn = function (_ctx: TypePoliciesContext) {
  return {
    fields: {
      categoryName(existing = NoteCategory.DEFAULT) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      originalCategoryName(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      connectionCategoryName(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      deletedAt: DateTimeNullable,
      create(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      excludeFromConnection(existing = false) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      pendingStatus(existing = null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
      open: {
        read(existing = null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return existing;
        },
        merge: true,
      },
    },
  };
};
