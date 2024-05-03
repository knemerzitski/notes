import { useApolloClient } from '@apollo/client';
import { gql } from '../../__generated__';
import { CollabClient, CollabClientSelection } from '~collab/client/collab-client';
import { Changeset } from '~collab/changeset/changeset';
import {
  CollabTextUnprocessedRecordType,
  UnprocessedRecordsHandlerFragment,
} from '../../__generated__/graphql';
import { OrderedMessageBuffer } from '~utils/ordered-message-buffer';
import { useEffect } from 'react';

const FRAGMENT_WATCH = gql(`
  fragment UnprocessedRecordsHandlerWatch on CollabText {
    unprocessedRecords {
      type
    }
  }
`);

const FRAGMENT = gql(`
  fragment UnprocessedRecordsHandler on CollabText {
    headText {
      revision
      changeset
    }
    submittedRecord {
      change {
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
    localChanges
    viewText
    activeSelection {
      start
      end
    }
    unprocessedRecords {
      type
      record {
        id
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
  },
`);

type CollabText = UnprocessedRecordsHandlerFragment;
type UnprocessedRecord = CollabText['unprocessedRecords'][0];

export function handleUnprocessedRecords(
  collabText: CollabText | null
): CollabText | undefined {
  if (!collabText) return;

  const { unprocessedRecords } = collabText;
  if (unprocessedRecords.length === 0) return;

  // Init records buffer to process records in revision order
  const recordsBuffer = new OrderedMessageBuffer<UnprocessedRecord>({
    getVersion(message) {
      return message.record.change.revision;
    },
    version: collabText.headText.revision,
    messages: unprocessedRecords,
  });

  // Don't have next record, return
  if (!recordsBuffer.hasNextMessage()) return;

  // CollabClient handles changeset updates
  const collabClient = new CollabClient({
    server: Changeset.parseValue(collabText.headText.changeset),
    submitted: Changeset.parseValueMaybe(collabText.submittedRecord?.change.changeset),
    local: Changeset.parseValueMaybe(collabText.localChanges),
    view: Changeset.fromInsertion(collabText.viewText),
  });

  // CollabClientSelection can update selection with CollabClient
  const collabClientSelection = new CollabClientSelection({
    client: collabClient,
    server: collabText.submittedRecord?.beforeSelection,
    submitted: collabText.submittedRecord?.afterSelection,
    local: collabText.activeSelection,
  });

  // Process records
  for (const { type, record } of recordsBuffer.popIterable()) {
    if (type === CollabTextUnprocessedRecordType.SubmittedAcknowleged) {
      collabClient.submittedChangesAcknowledged();
    } else {
      // ExternalChange with selection adjustment
      const changeset = Changeset.parseValue(record.change.changeset);
      collabClientSelection.handleExternalChange(changeset);

      // TODO update history
    }
  }

  return {
    headText: {
      changeset: collabClient.server.serialize(),
      revision: recordsBuffer.currentVersion,
    },
    submittedRecord:
      collabClient.haveSubmittedChanges() && collabText.submittedRecord
        ? {
            ...collabText.submittedRecord,
            change: {
              ...collabText.submittedRecord.change,
              changeset: collabClient.submitted.serialize(),
            },
            beforeSelection: collabClientSelection.server.serialize(),
            afterSelection: collabClientSelection.submitted.serialize(),
          }
        : null,
    localChanges: collabClient.haveLocalChanges() ? collabClient.local.serialize() : null,
    viewText: collabClient.view.joinInsertions(),
    activeSelection: collabText.activeSelection
      ? collabClientSelection.local.serialize()
      : null,
    unprocessedRecords: [...recordsBuffer.getAllMessages()],
  };
}

interface UnprocessedRecordsHandlerProps {
  collabTextId: string;
}

export default function UnprocessedRecordsHandler({
  collabTextId,
}: UnprocessedRecordsHandlerProps) {
  const apolloClient = useApolloClient();

  useEffect(() => {
    const subscription = apolloClient
      .watchFragment({
        from: {
          id: collabTextId,
          __typename: 'CollabText',
        },
        fragment: FRAGMENT_WATCH,
      })
      .subscribe({
        next() {
          // Cannot update unprocessedRecords this tick since it was just modifed
          setTimeout(() => {
            apolloClient.cache.updateFragment(
              {
                id: apolloClient.cache.identify({
                  id: collabTextId,
                  __typename: 'CollabText',
                }),
                fragment: FRAGMENT,
                overwrite: true,
              },
              handleUnprocessedRecords
            );
          }, 0);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  return null;
}
