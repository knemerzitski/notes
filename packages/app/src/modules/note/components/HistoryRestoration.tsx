import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { NoteTextField } from '../../../__generated__/graphql';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { ApolloCache, useApolloClient } from '@apollo/client';
import isDefined from '~utils/type-guards/isDefined';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-adapter';
import { RevisionChangeset } from '~collab/records/record';
import { useNoteCollabText } from '../context/NoteContentIdToCollabTextsProvider';
import { UserEditorRecords } from '~collab/client/user-editor-records';
import { ServerRecords } from '~collab/records/server-records';
import { EditorRevisionRecord } from '~collab/client/collab-editor';
import { readSessionContext } from '../../auth/state/persistence';

const QUERY = gql(`
  query HistoryRestoration($noteContentId: String!, $fieldName: NoteTextField!, 
                            $recordsBeforeRevision: NonNegativeInt!, $recordsLast: PositiveInt!, 
                            $tailRevision: NonNegativeInt!){
    note(contentId: $noteContentId) {
      id
      textFields(name: $fieldName) {
        key
        value {
          id
          textAtRevision(revision: $tailRevision) {
            revision
            changeset
          }
          recordsConnection(before: $recordsBeforeRevision, last: $recordsLast){
            records {
              id
              creatorUserId
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
            pageInfo {
              hasPreviousPage
            }
          }
        }
      }
    }
  }

`);

const FRAGMENT_PAGEINFO = gql(`
  fragment HistoryRestorationPageInfo on CollabText {
    recordsConnection {
      pageInfo {
        hasPreviousPage
      }
    }
  }
`);

const FRAGMENT_TEXT_AT_REVISION = gql(`
  fragment HistoryRestorationTextAtRevision on CollabText {
    textAtRevision(revision: $revision) {
      revision
      changeset
    }
  }
`);

const FRAGMENT_RECORDS = gql(`
  fragment HistoryRestorationRecords on CollabText {
    recordsConnection(before: $before) {
      records {
        id
        creatorUserId
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
  }
`);

export interface HistoryRestorationProps {
  fieldName: NoteTextField;
  /**
   * Amount of entries to fetch in one go.
   * @default 20
   */
  fetchEntriesCount?: number;
  /**
   * Fetch more entries when n-amount of entries are left in history that can be undo.
   * @default 10
   */
  triggerEntriesRemaining?: number;
}

export default function HistoryRestoration({
  fieldName,
  fetchEntriesCount = 20,
  triggerEntriesRemaining = 10,
}: HistoryRestorationProps) {
  const apolloClient = useApolloClient();
  const noteContentId = useNoteContentId();
  const isFetchingRef = useRef(false);
  const collabText = useNoteCollabText(fieldName);
  const { editor, id: collabTextId } = collabText.value;

  useEffect(() => {
    if (cacheHasOlderRecords(apolloClient.cache, collabTextId) === false) return;

    // TODO put sessions to context provider
    const sessions = readSessionContext();
    const currentUserId = sessions?.currentSession.id ?? '';

    const serverRecords = new ApolloCacheServerRecords({
      cache: apolloClient.cache,
      collabTextId,
      initialTailText: {
        revision: editor.headRevision,
        changeset: editor.client.server,
      },
    });
    const userEditorRecords = new UserEditorRecords({
      userId: String(currentUserId),
      serverRecords,
    });
    editor.setServerRecords(userEditorRecords);

    const appliedUndoHandler = () => {
      void attemptFetchMore();
    };

    async function attemptFetchMore() {
      const historyEntriesRemaining = editor.history.localIndex + 1;
      const requiredEntriesInCacheCount =
        triggerEntriesRemaining - historyEntriesRemaining + 1;
      const haveEnoughEntries = userEditorRecords.hasOwnOlderRecords(
        editor.history.tailRevision,
        requiredEntriesInCacheCount
      );

      if (
        isFetchingRef.current ||
        cacheHasOlderRecords(apolloClient.cache, collabTextId) === false
      ) {
        return;
      }

      if (!haveEnoughEntries) {
        try {
          isFetchingRef.current = true;

          const currentTailRevision = serverRecords.tailText.revision;
          const newTailRevision = Math.max(0, currentTailRevision - fetchEntriesCount);

          const result = await apolloClient.query({
            query: QUERY,
            variables: {
              fieldName,
              noteContentId,
              recordsBeforeRevision: currentTailRevision + 1,
              recordsLast: fetchEntriesCount,
              tailRevision: newTailRevision,
            },
            fetchPolicy: 'network-only'
          });

          result.data.note.textFields.forEach((textField) => {
            if (textField.key !== fieldName) return;
            const recordsConnection = textField.value.recordsConnection;
            if (!recordsConnection.pageInfo.hasPreviousPage) {
              // Stop listening since no more records
              editor.eventBus.off('appliedUndo', appliedUndoHandler);
            }

            editor.eventBus.emit('tailRevisionChanged', {
              revision: serverRecords.tailText.revision,
            });
          });

          void attemptFetchMore();
        } finally {
          isFetchingRef.current = false;
        }
      }
    }

    void attemptFetchMore();
    return () => {
      editor.eventBus.on('appliedUndo', appliedUndoHandler);
      editor.setServerRecords(null);
    };
  }, [
    editor,
    noteContentId,
    fieldName,
    apolloClient,
    fetchEntriesCount,
    triggerEntriesRemaining,
    collabTextId,
  ]);

  return null;
}

export function cacheHasOlderRecords<TSerialized>(
  cache: ApolloCache<TSerialized>,
  collabTextId: string
) {
  const collabText = cache.readFragment({
    id: cache.identify({
      __typename: 'CollabText',
      id: collabTextId,
    }),
    fragment: FRAGMENT_PAGEINFO,
  });

  return collabText?.recordsConnection.pageInfo.hasPreviousPage;
}

export interface ApolloCacheServerRecordsParams<TCacheShape> {
  initialTailText: RevisionChangeset;
  cache: ApolloCache<TCacheShape>;
  collabTextId: string;
}

export class ApolloCacheServerRecords<TCacheShape>
  implements ServerRecords<EditorRevisionRecord>
{
  private readonly cache: ApolloCache<TCacheShape>;
  readonly collabTextRef: string | undefined;

  private initialTailText: RevisionChangeset;
  get tailText(): RevisionChangeset {
    const tailText = this.readTextAtRevision();
    return tailText ? RevisionChangeset.parseValue(tailText) : this.initialTailText;
  }

  constructor(params: ApolloCacheServerRecordsParams<TCacheShape>) {
    this.initialTailText = params.initialTailText;
    this.cache = params.cache;
    this.collabTextRef = params.cache.identify({
      __typename: 'CollabText',
      id: params.collabTextId,
    });
  }

  private readTextAtRevision(revision?: number) {
    return this.cache.readFragment({
      id: this.collabTextRef,
      fragment: FRAGMENT_TEXT_AT_REVISION,
      variables: {
        revision,
      },
    })?.textAtRevision;
  }

  private readRecords(before: number) {
    return this.cache
      .readFragment({
        id: this.collabTextRef,
        fragment: FRAGMENT_RECORDS,
        variables: {
          before,
        },
      })
      ?.recordsConnection.records.filter(isDefined);
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<EditorRevisionRecord>> {
    const records = this.readRecords(headRevision + 1);

    if (!records || records.length === 0) {
      return {
        [Symbol.iterator]: () => ({
          next: () => {
            return {
              done: true,
              value: undefined,
            };
          },
        }),
      };
    }

    let index = records.length - 1;

    return {
      [Symbol.iterator]: () => ({
        next: () => {
          const value = records[index--];
          if (value != null) {
            return {
              done: false,
              value: collabTextRecordToEditorRevisionRecord(value),
            };
          } else {
            return { done: true, value };
          }
        },
      }),
    };
  }

  getTextAt(revision: number): Readonly<RevisionChangeset> {
    return RevisionChangeset.parseValue(this.readTextAtRevision(revision));
  }
}
