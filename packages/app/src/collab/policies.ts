import { FieldPolicy, TypePolicies } from '@apollo/client';
import {
  CollabText,
  CollabTextLocalHistory,
  CollabTextLocalHistoryEntry,
  CollabTextUnprocessedRecord,
} from '../__generated__/graphql';
import { Changeset } from '~collab/changeset/changeset';
import { CollabClient } from '~collab/client/collab-client';

export const submittedRecord: FieldPolicy<
  CollabText['submittedRecord'],
  CollabText['submittedRecord']
> = {
  read(existing = null) {
    return existing;
  },
  merge(existing, incoming) {
    if (!existing || !incoming) return incoming;
    // Both cannot be defined at the same time as submittedRecord
    // must be set to null before setting new value
    throw new Error('Cannot overwrite existng submittedRecord');
  },
};

export const localChanges: FieldPolicy<
  CollabText['localChanges'],
  CollabText['localChanges']
> = {
  read(existing = null) {
    return existing as unknown[] | null | undefined;
  },
};

export const viewText: FieldPolicy<CollabText['viewText'], CollabText['viewText']> = {
  read(existing, { readField }) {
    if (typeof existing === 'string') {
      return existing;
    }

    const headText = readField<CollabText['headText']>('headText');
    const submittedRecord = readField<CollabText['submittedRecord']>('submittedRecord');
    const localChanges = readField<CollabText['localChanges']>('localChanges');

    const collabClient = new CollabClient({
      server: Changeset.parseValueMaybe(headText?.changeset),
      submitted: Changeset.parseValueMaybe(submittedRecord?.change.changeset),
      local: Changeset.parseValueMaybe(localChanges),
    });

    return collabClient.view.joinInsertions();
  },
};

export const activeSelection: FieldPolicy<
  CollabText['activeSelection'],
  CollabText['activeSelection']
> = {
  read(existing = { start: 0, end: null }) {
    return existing;
  },
};

export const unprocessedRecords: FieldPolicy<
  CollabText['unprocessedRecords'],
  CollabText['unprocessedRecords']
> = {
  read(existing = []) {
    return existing as CollabTextUnprocessedRecord[];
  },
};

export const history_tailText: FieldPolicy<
  CollabTextLocalHistory['tailText'],
  CollabTextLocalHistory['tailText']
> = {
  read(existing = { changeset: Changeset.EMPTY.serialize(), revision: -1 }) {
    return existing;
  },
};

export const history_serverIndex: FieldPolicy<
  CollabTextLocalHistory['serverIndex'],
  CollabTextLocalHistory['serverIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const history_submittedIndex: FieldPolicy<
  CollabTextLocalHistory['submittedIndex'],
  CollabTextLocalHistory['submittedIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const history_localIndex: FieldPolicy<
  CollabTextLocalHistory['localIndex'],
  CollabTextLocalHistory['localIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const history_entries: FieldPolicy<
  CollabTextLocalHistory['entries'],
  CollabTextLocalHistory['entries']
> = {
  read(existing = []) {
    return existing as CollabTextLocalHistoryEntry[];
  },
};

const collabTextPolicies: TypePolicies = {
  CollabText: {
    fields: {
      submittedRecord,
      localChanges,
      viewText,
      activeSelection,
      unprocessedRecords,
    },
  },
  CollabTextLocalHistory: {
    fields: {
      tailText: history_tailText,
      serverIndex: history_serverIndex,
      submittedIndex: history_submittedIndex,
      localIndex: history_localIndex,
      entries: history_entries,
    },
  },
};

export default collabTextPolicies;
