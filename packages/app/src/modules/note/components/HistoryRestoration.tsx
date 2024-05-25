import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { NoteTextField } from '../../../__generated__/graphql';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { ApolloCache, useApolloClient } from '@apollo/client';
import isDefined from '~utils/type-guards/isDefined';
import { collabTextRecordToEditorRevisionRecord } from '../../collab/editor-graphql-adapter';
import { RevisionChangeset } from '~collab/records/record';
import { useNoteCollabText } from '../context/NoteContentIdToCollabTextsProvider';
import { UserRecords, ServerRecordsFacade } from '~collab/client/user-records';
import { EditorRevisionRecord } from '~collab/client/collab-editor';
import { readSessionContext } from '../../auth/state/persistence';

const QUERY = gql(`
  query HistoryRestoration($noteContentId: String!, $fieldName: NoteTextField!, 
                            $recordsBeforeRevision: NonNegativeInt!, $recordsLast: PositiveInt!, 
                            $tailRevision: NonNegativeInt! $skipTailRevision: Boolean!){
    note(contentId: $noteContentId) {
      id
      textFields(name: $fieldName) {
        key
        value {
          id
          textAtRevision(revision: $tailRevision) @skip(if: $skipTailRevision) {
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
    const userRecords = new UserRecords({
      userId: String(currentUserId),
      serverRecords,
    });
    editor.setUserRecords(userRecords);

    // TODO ask for any records right before headRevision not just from oldest..

    const editorUnsubscribe = editor.eventBus.onMany(
      ['appliedUndo', 'replacedHeadText'],
      () => {
        void attemptFetchMore();
      }
    );

    async function attemptFetchMore() {
      const historyEntriesRemaining = editor.history.localIndex + 1;
      const requiredEntriesInCacheCount =
        triggerEntriesRemaining - historyEntriesRemaining + 1;
      const haveEnoughEntries = userRecords.hasOwnOlderRecords(
        editor.history.tailRevision,
        requiredEntriesInCacheCount
      );

      if (isFetchingRef.current) {
        return;
      }

      if (!haveEnoughEntries) {
        try {
          isFetchingRef.current = true;

          // Calc which records and text must be fetched
          const recordsBeforeRevision = editor.history.tailRevision + 1;
          const minRecordsAfterRevision = Math.max(
            0,
            recordsBeforeRevision - fetchEntriesCount - 1
          );

          const availableRecords = serverRecords.readRecords({
            after: minRecordsAfterRevision,
          });
          const newestCachedRevision =
            availableRecords?.[availableRecords.length - 1]?.change.revision;
          const recordsLast = Math.min(
            fetchEntriesCount,
            Math.max(
              0,
              recordsBeforeRevision -
                (newestCachedRevision ?? minRecordsAfterRevision) -
                1
            )
          );
          if (recordsLast === 0) return;

          const tailRevision = Math.max(0, recordsBeforeRevision - recordsLast - 1);
          const skipTailRevision = Boolean(serverRecords.getTextAt(tailRevision));

          const result = await apolloClient.query({
            query: QUERY,
            variables: {
              fieldName,
              noteContentId,
              recordsBeforeRevision,
              recordsLast,
              tailRevision,
              skipTailRevision,
            },
          });

          result.data.note.textFields.forEach((textField) => {
            if (textField.key !== fieldName) return;
            const recordsConnection = textField.value.recordsConnection;
            if (!recordsConnection.pageInfo.hasPreviousPage) {
              // Stop listening since no more records
              editorUnsubscribe();
            }

            editor.eventBus.emit('userRecordsUpdated', {
              userRecords,
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
      editorUnsubscribe();
      if (editor.userRecords === userRecords) {
        editor.setUserRecords(null);
      }
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

export interface ApolloCacheServerRecordsParams<TCacheShape> {
  initialTailText: RevisionChangeset;
  cache: ApolloCache<TCacheShape>;
  collabTextId: string;
}

export class ApolloCacheServerRecords<TCacheShape>
  implements ServerRecordsFacade<EditorRevisionRecord>
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

  readTextAtRevision(revision?: number) {
    return this.cache.readFragment({
      id: this.collabTextRef,
      fragment: FRAGMENT_TEXT_AT_REVISION,
      variables: {
        revision,
      },
    })?.textAtRevision;
  }

  readRecords(variables: { before?: number; after?: number }) {
    return this.cache
      .readFragment({
        id: this.collabTextRef,
        fragment: FRAGMENT_RECORDS,
        variables,
      })
      ?.recordsConnection.records.filter(isDefined);
  }

  newestRecordsIterable(headRevision: number): Iterable<Readonly<EditorRevisionRecord>> {
    const records = this.readRecords({
      before: headRevision + 1,
    });
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
