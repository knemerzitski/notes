import { FieldPolicy, TypePolicies } from '@apollo/client';

import { Changeset } from '~collab/changeset/changeset';
import { CollabClient } from '~collab/client/collab-client';

import { CollabText, CollabTextUnprocessedRecord } from '../../__generated__/graphql';

import { activeCollabTextsVar } from './reactive-vars';

export const CollabText_id: FieldPolicy<CollabText['id'], CollabText['id']> = {
  merge(_existing, incoming, { toReference }) {
    const collabTextRef = toReference({
      id: incoming,
      __typename: 'CollabText',
    });

    if (collabTextRef) {
      const activeCollabTexts = activeCollabTextsVar();
      if (!(collabTextRef.__ref in activeCollabTexts)) {
        activeCollabTextsVar({
          ...activeCollabTexts,
          [collabTextRef.__ref]: collabTextRef,
        });
      }
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

const collabTextPolicies: TypePolicies = {
  Query: {
    fields: {
      allActiveCollabTexts: {
        read() {
          return Object.values(activeCollabTextsVar());
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
};

export default collabTextPolicies;
