import { gql } from '../../__generated__/gql';
import { ApolloCache, useApolloClient } from '@apollo/client';
import {
  UseEditorReadFragment,
  UseEditorWriteFragment,
} from '../../__generated__/graphql';
import { Changeset } from '~collab/changeset/changeset';
import { useCallback } from 'react';
import { CollabClient } from '~collab/client/collab-client';
import updateFragment from '../../apollo/utils/updateFragment';
import {
  ChangesetOperation,
  insertionOperation as insertionAsChangesetOperation,
  deletionCountOperation as deletionAsChangesetOperation,
} from '~collab/client/changeset-operations';
import { clampSelectionRange } from '~collab/client/selection-range';
import useViewText from './useViewText';

export const FRAGMENT_READ_OPERATION = gql(`
  fragment UseEditorRead on CollabText {
    headText {
      changeset
    }
    submittedRecord {
      change {
        changeset
      }
    }
    localChanges
    viewText
    activeSelection {
      start
      end
    }
    history {
      serverIndex
      submittedIndex
      localIndex
      entries {
        execute {
          changeset
          selection {
            start
            end
          }
        }
        undo {
          changeset
          selection {
            start
            end
          }
        }
      }
    }
  }
`);

export const FRAGMENT_WRITE_OPERATION = gql(`
  fragment UseEditorWrite on CollabText {
    localChanges
    viewText
    activeSelection {
      start
      end
    }
    history {
      serverIndex
      submittedIndex
      localIndex
      entries {
        execute {
          changeset
          selection {
            start
            end
          }
        }
        undo {
          changeset
          selection {
            start
            end
          }
        }
      }
    }
  }
`);

const FRAGMENT_READ_SELECTION = gql(`
  fragment UseEditorReadSelection on CollabText {
    viewText
  }
`);

const FRAGMENT_WRITE_SELECTION = gql(`
  fragment UseEditorWriteSelection on CollabText {
    activeSelection {
      start
      end
    }
  }
`);

type ReadCollabText = UseEditorReadFragment;
type WriteCollabText = UseEditorWriteFragment;

export default function useEditor(collabTextId: string) {
  const viewText = useViewText(collabTextId);
  const insertText = useInsertText(collabTextId);
  const deleteText = useDeleteText(collabTextId);
  const setSelectionRange = useSetSelectionRange(collabTextId);
  const undo = useHistoryMove(collabTextId, 'undo');
  const redo = useHistoryMove(collabTextId, 'execute');

  return {
    viewText,
    insertText,
    deleteText,
    setSelectionRange,
    undo,
    redo,
  };
}

export function pushChangesetOperation(
  collabText: ReadCollabText,
  operation: ChangesetOperation
): WriteCollabText | undefined {
  const collabClient = new CollabClient({
    server: Changeset.parseValue(collabText.headText.changeset),
    submitted: Changeset.parseValueMaybe(collabText.submittedRecord?.change.changeset),
    local: Changeset.parseValueMaybe(collabText.localChanges),
    view: Changeset.fromInsertion(collabText.viewText),
  });

  collabClient.composeLocalChange(operation.changeset);
  const activeSelection = {
    start: operation.newSelectionPos,
    end: null,
  };
  const undoSelection = collabText.activeSelection ?? {
    start: 0,
    end: null,
  };

  let { entries, serverIndex, submittedIndex, localIndex } = collabText.history;
  if (collabText.history.localIndex < collabText.history.entries.length - 1) {
    entries = entries.slice(0, collabText.history.localIndex + 1);

    submittedIndex = Math.min(submittedIndex, localIndex);
    serverIndex = Math.min(serverIndex, submittedIndex);
  }

  localIndex += 1;

  return {
    localChanges: collabClient.haveLocalChanges() ? collabClient.local.serialize() : null,
    viewText: collabClient.view.joinInsertions(),
    activeSelection,
    history: {
      serverIndex,
      submittedIndex,
      localIndex,
      entries: [
        ...entries,
        {
          execute: {
            changeset: operation.changeset.serialize(),
            selection: activeSelection,
          },
          undo: {
            changeset: operation.inverseChangeset.serialize(),
            selection: undoSelection,
          },
        },
      ],
    },
  };
}

type HistoryMoveType = 'execute' | 'undo';

function pickHistoryEntry(
  entries: ReadCollabText['history']['entries'],
  localIndex: number,
  type: HistoryMoveType
) {
  if (type === 'undo') {
    const entry = entries[localIndex];
    if (entry) {
      return {
        operation: entry.undo,
        newLocalIndex: localIndex - 1,
      };
    }
  } else {
    const entry = entries[localIndex + 1];
    if (entry) {
      return {
        operation: entry.execute,
        newLocalIndex: localIndex + 1,
      };
    }
  }
  return;
}

export function historyMoveOperation(
  collabText: ReadCollabText,
  type: HistoryMoveType
): WriteCollabText | undefined {
  const pickedEntry = pickHistoryEntry(
    collabText.history.entries,
    collabText.history.localIndex,
    type
  );
  if (!pickedEntry) return;
  const { operation, newLocalIndex } = pickedEntry;

  const collabClient = new CollabClient({
    server: Changeset.parseValue(collabText.headText.changeset),
    submitted: Changeset.parseValueMaybe(collabText.submittedRecord?.change.changeset),
    local: Changeset.parseValueMaybe(collabText.localChanges),
    view: Changeset.fromInsertion(collabText.viewText),
  });

  collabClient.composeLocalChange(Changeset.parseValue(operation.changeset));

  return {
    localChanges: collabClient.haveLocalChanges() ? collabClient.local.serialize() : null,
    viewText: collabClient.view.joinInsertions(),
    activeSelection: operation.selection,
    history: {
      ...collabText.history,
      localIndex: newLocalIndex,
    },
  };
}

function updateCollabTextWithReadWriteFragment<TSerialized>(
  id: string | undefined,
  cache: ApolloCache<TSerialized>,
  update: (data: ReadCollabText | null) => WriteCollabText | undefined
) {
  updateFragment(
    cache,
    {
      id,
      read: {
        fragment: FRAGMENT_READ_OPERATION,
      },
      write: {
        fragment: FRAGMENT_WRITE_OPERATION,
      },
    },
    update
  );
}

export function useInsertText(collabTextId: string) {
  const apolloClient = useApolloClient();

  return useCallback(
    (value: string) => {
      updateCollabTextWithReadWriteFragment(
        apolloClient.cache.identify({
          id: collabTextId,
          __typename: 'CollabText',
        }),
        apolloClient.cache,
        (collabText) => {
          if (!collabText) return;
          return pushChangesetOperation(
            collabText,
            insertionAsChangesetOperation(
              value,
              collabText.viewText,
              collabText.activeSelection
            )
          );
        }
      );
    },
    [apolloClient, collabTextId]
  );
}

export function useDeleteText(collabTextId: string) {
  const apolloClient = useApolloClient();

  return useCallback(
    (count = 1) => {
      updateCollabTextWithReadWriteFragment(
        apolloClient.cache.identify({
          id: collabTextId,
          __typename: 'CollabText',
        }),
        apolloClient.cache,
        (collabText) => {
          if (!collabText) return;
          const operation = deletionAsChangesetOperation(
            count,
            collabText.viewText,
            collabText.activeSelection
          );
          if (!operation) return;
          return pushChangesetOperation(collabText, operation);
        }
      );
    },
    [apolloClient, collabTextId]
  );
}

export function useHistoryMove(collabTextId: string, type: HistoryMoveType) {
  const apolloClient = useApolloClient();

  return useCallback(() => {
    updateCollabTextWithReadWriteFragment(
      apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }),
      apolloClient.cache,
      (collabText) => {
        if (!collabText) return;
        return historyMoveOperation(collabText, type);
      }
    );
  }, [apolloClient, collabTextId, type]);
}

export function useSetSelectionRange(collabTextId: string) {
  const apolloClient = useApolloClient();

  return useCallback(
    (start: number, end: number | null = null) => {
      updateFragment(
        apolloClient.cache,
        {
          id: apolloClient.cache.identify({
            id: collabTextId,
            __typename: 'CollabText',
          }),
          read: {
            fragment: FRAGMENT_READ_SELECTION,
          },
          write: {
            fragment: FRAGMENT_WRITE_SELECTION,
          },
        },
        (collabText) => {
          if (!collabText) return;

          return {
            activeSelection: clampSelectionRange(
              { start, end },
              collabText.viewText.length
            ),
          };
        }
      );
    },
    [apolloClient, collabTextId]
  );
}
