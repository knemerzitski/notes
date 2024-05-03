import LocalChangesWatcher, {
  LocalChangesWatcherProps,
} from './watch/LocalChangesWatcher';
import SubmittedRecordWatcher, {
  SubmittedRecordWatcherProps,
} from './watch/SubmittedRecordWatcher';
import { useDebouncedCallback, Options } from 'use-debounce';
import { useEffect, useRef } from 'react';
import { gql } from '../../__generated__/gql';
import { useApolloClient } from '@apollo/client';
import { nanoid } from 'nanoid';
import {
  LocalChangesToSubmittedRecordDebouncedReadFragment,
  LocalChangesToSubmittedRecordDebouncedWriteFragment,
} from '../../__generated__/graphql';
import updateFragment from '../../apollo/utils/updateFragment';

const FRAGMENT_READ = gql(`
  fragment LocalChangesToSubmittedRecordDebouncedRead on CollabText {
    headText {
      revision
    }
    localChanges
    submittedRecord {
      generatedId
    }
    history {
      localIndex
      entries {
        execute {
          selection {
            start
            end
          }
        }
        undo {
          selection {
            start
            end
          }
        }
      }
    }
  }
`);

export const FRAGMENT_WRITE = gql(`
  fragment LocalChangesToSubmittedRecordDebouncedWrite on CollabText {
    localChanges
    submittedRecord {
      generatedId
      change {
        revision
        changeset
      }
      beforeSelection {
        start
        end
      }
      afterSelection {
        start
        end
      }
    }
  }
`);

type ReadCollabText = LocalChangesToSubmittedRecordDebouncedReadFragment;
type WriteCollabText = LocalChangesToSubmittedRecordDebouncedWriteFragment;

interface LocalChangesToSubmittedRecordOptions {
  generateId?: () => string;
}

export function applyLocalChangesToSubmittedRecord(
  collabText: ReadCollabText | null,
  options?: LocalChangesToSubmittedRecordOptions
): WriteCollabText | undefined {
  if (!collabText || !collabText.localChanges) {
    return;
  }

  const currentHistoryEntry = collabText.history.entries[collabText.history.localIndex];
  if (!currentHistoryEntry) {
    return;
  }

  return {
    localChanges: null,
    submittedRecord: {
      generatedId: (options?.generateId ?? (() => nanoid(6)))(),
      change: {
        changeset: collabText.localChanges,
        revision: collabText.headText.revision,
      },
      beforeSelection: currentHistoryEntry.undo.selection,
      afterSelection: currentHistoryEntry.execute.selection,
    },
  };
}

interface LocalChangesToSubmittedRecordDebouncedProps {
  collabTextId: string;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}

export default function LocalChangesToSubmittedRecordDebounced({
  collabTextId,
  wait = 1000,
  options,
}: LocalChangesToSubmittedRecordDebouncedProps) {
  const apolloClient = useApolloClient();

  // TODO instead of refs just query when needed?
  const haveLocalChangesRef = useRef(false);
  const haveSubmittedRecordsRef = useRef(false);
  const mustWriteWhenSubmittedRecordIsNull = useRef(false);

  function writeLocalChangesToSubmittedRecord() {
    if (!haveLocalChangesRef.current || haveSubmittedRecordsRef.current) {
      return;
    }

    const id = apolloClient.cache.identify({
      id: collabTextId,
      __typename: 'CollabText',
    });

    updateFragment(
      apolloClient.cache,
      {
        id,
        read: {
          fragment: FRAGMENT_READ,
        },
        write: {
          fragment: FRAGMENT_WRITE,
          overwrite: true,
        },
      },
      (collabText) => {
        // Verify no submitted record exists
        const haveSubmittedRecord = collabText?.submittedRecord != null;
        if (haveSubmittedRecord) return;

        return applyLocalChangesToSubmittedRecord(data);
      }
    );
  }

  const debouncedWriteLocalChangesToSubmittedRecord = useDebouncedCallback(
    () => {
      if (haveSubmittedRecordsRef.current) {
        mustWriteWhenSubmittedRecordIsNull.current = true;
      } else {
        writeLocalChangesToSubmittedRecord();
      }
    },
    wait,
    options
  );

  const handleLocalChanges: LocalChangesWatcherProps['onNext'] = (value) => {
    const haveLocalChanges = value.data.localChanges != null;
    haveLocalChangesRef.current = haveLocalChanges;

    if (haveLocalChanges) {
      debouncedWriteLocalChangesToSubmittedRecord();
    } else {
      debouncedWriteLocalChangesToSubmittedRecord.cancel();
    }
  };

  const handleSubmittedRecord: SubmittedRecordWatcherProps['onNext'] = (value) => {
    const haveSubmittedRecord = value.data.submittedRecord != null;
    haveSubmittedRecordsRef.current = haveSubmittedRecord;

    if (mustWriteWhenSubmittedRecordIsNull.current) {
      mustWriteWhenSubmittedRecordIsNull.current = false;
      writeLocalChangesToSubmittedRecord();
    }
  };

  return (
    <>
      <LocalChangesWatcher collabTextId={collabTextId} onNext={handleLocalChanges} />
      <SubmittedRecordWatcher
        collabTextId={collabTextId}
        onNext={handleSubmittedRecord}
      />
    </>
  );
}
