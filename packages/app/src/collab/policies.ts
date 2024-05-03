import { FieldPolicy, Reference, TypePolicies, makeVar } from '@apollo/client';
import {
  CollabText,
  CollabTextLocalHistory,
  CollabTextLocalHistoryEntry,
  CollabTextUnprocessedRecord,
} from '../__generated__/graphql';
import { Changeset } from '~collab/changeset/changeset';
import { CollabClient } from '~collab/client/collab-client';

const activeCollabTextsVar = makeVar<Reference[]>([]);

export const CollabText_id: FieldPolicy<CollabText['id'], CollabText['id']> = {
  merge(_existing, incoming, { toReference }) {
    const collabTextRef = toReference({
      id: incoming,
      __typename: 'CollabText',
    });
    if (!collabTextRef) return incoming;

    const activeCollabTexts = activeCollabTextsVar();
    if (!activeCollabTexts.some((val) => val.__ref === collabTextRef.__ref)) {
      activeCollabTextsVar([...activeCollabTexts, collabTextRef]);
    }

    return incoming;
  },
};

export const CollabText_submittedRecord: FieldPolicy<
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

export const CollabText_localChanges: FieldPolicy<
  CollabText['localChanges'],
  CollabText['localChanges']
> = {
  read(existing = null) {
    return existing as unknown[] | null | undefined;
  },
};

export const CollabText_viewText: FieldPolicy<
  CollabText['viewText'],
  CollabText['viewText']
> = {
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

export const CollabText_activeSelection: FieldPolicy<
  CollabText['activeSelection'],
  CollabText['activeSelection']
> = {
  read(existing = { start: 0, end: null }) {
    return existing;
  },
};

export const CollabText_unprocessedRecords: FieldPolicy<
  CollabText['unprocessedRecords'],
  CollabText['unprocessedRecords']
> = {
  read(existing = []) {
    return existing as CollabTextUnprocessedRecord[];
  },
};

export const CollabText_history: FieldPolicy<
  CollabText['history'],
  CollabText['history']
> = {
  read(
    existing = {
      __typename: 'CollabTextLocalHistory',
      serverIndex: -1,
      submittedIndex: -1,
      localIndex: -1,
      tailText: {
        changeset: Changeset.EMPTY.serialize(),
        revision: -1,
      },
      entries: [],
    }
  ) {
    return existing;
  },
};

export const CollabTextLocalHistory_tailText: FieldPolicy<
  CollabTextLocalHistory['tailText'],
  CollabTextLocalHistory['tailText']
> = {
  read(existing = { changeset: Changeset.EMPTY.serialize(), revision: -1 }) {
    return existing;
  },
};

export const CollabTextLocalHistory_serverIndex: FieldPolicy<
  CollabTextLocalHistory['serverIndex'],
  CollabTextLocalHistory['serverIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const CollabTextLocalHistory_submittedIndex: FieldPolicy<
  CollabTextLocalHistory['submittedIndex'],
  CollabTextLocalHistory['submittedIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const CollabTextLocalHistory_localIndex: FieldPolicy<
  CollabTextLocalHistory['localIndex'],
  CollabTextLocalHistory['localIndex']
> = {
  read(existing = -1) {
    return existing;
  },
};

export const CollabTextLocalHistory_entries: FieldPolicy<
  CollabTextLocalHistory['entries'],
  CollabTextLocalHistory['entries']
> = {
  read(existing = []) {
    return existing as CollabTextLocalHistoryEntry[];
  },
};

const collabTextPolicies: TypePolicies = {
  Query: {
    fields: {
      allActiveCollabTexts: {
        read() {
          return activeCollabTextsVar();
        },
      },
    },
  },
  CollabText: {
    fields: {
      id: CollabText_id,
      submittedRecord: CollabText_submittedRecord,
      localChanges: CollabText_localChanges,
      viewText: CollabText_viewText,
      activeSelection: CollabText_activeSelection,
      unprocessedRecords: CollabText_unprocessedRecords,
      history: CollabText_history,
    },
  },
  CollabTextLocalHistory: {
    fields: {
      tailText: CollabTextLocalHistory_tailText,
      serverIndex: CollabTextLocalHistory_serverIndex,
      submittedIndex: CollabTextLocalHistory_submittedIndex,
      localIndex: CollabTextLocalHistory_localIndex,
      entries: CollabTextLocalHistory_entries,
    },
  },
};

export default collabTextPolicies;
