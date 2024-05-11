import { FieldPolicy, StoreObject, Reference } from '@apollo/client';
import { UserNoteMapping } from '../../../../__generated__/graphql';
import { fieldMergeReferenceSet } from '../../../../apollo/utils/fieldMergeReferenceSet';

export const userNoteMappings: FieldPolicy<
  (UserNoteMapping | StoreObject | Reference)[],
  (UserNoteMapping | StoreObject | Reference)[]
> = {
  merge: fieldMergeReferenceSet,
};
