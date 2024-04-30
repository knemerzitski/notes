import { FieldPolicy, TypePolicies } from '@apollo/client';
import { CollabText, RevisionChangeset } from '../__generated__/graphql';

export const unprocessedRecords: FieldPolicy<
  CollabText['unprocessedRecords'],
  CollabText['unprocessedRecords']
> = {
  /**
   * Merges existing and incoming by recordchange.revision.
   * If done === true then record is removed.
   */
  merge(existing, incoming, { mergeObjects, readField }) {
    // TODO test
    const existingByRevision = new Map(
      existing?.map((item) => [item.record.change.revision, item])
    );

    incoming.forEach((incomingItem) => {
      const incomingChange = readField<RevisionChangeset>({
        from: incomingItem.record,
        fieldName: 'change',
      });
      const key = incomingChange?.revision;
      if (key == null) return;

      const existingItem = existingByRevision.get(key);
      if (existingItem) {
        if (incomingItem.done) {
          existingByRevision.delete(key);
        } else {
          existingByRevision.set(key, mergeObjects(existingItem, incomingItem));
        }
      } else {
        existingByRevision.set(key, incomingItem);
      }
    });

    return [...existingByRevision.values()];
  },
};

export const submittedRecord: FieldPolicy<
  CollabText['submittedRecord'],
  CollabText['submittedRecord']
> = {
  merge(existing, incoming) {
    if (!existing || !incoming) return incoming;
    // Both cannot be defined as submittedRecord must be set to null before setting new value
    throw new Error('Cannot overwrite existng submittedRecord');
  },
};

const collabTextPolicies: TypePolicies = {
  CollabText: {
    fields: {
      // TODO Create viewText when CollabText is written
      // viewText: {
      //   read(existing, { readField }): string | null {
      //     if (typeof existing === 'string') {
      //       return existing;
      //     }

      //     const headText = readField('headText') as Partial<RevisionChangeset>;

      //     return Changeset.parseValue(headText.changeset).joinInsertions();
      //   },
      // },
      submittedRecord,
      unprocessedRecords,
    },
  },
};

export default collabTextPolicies;
