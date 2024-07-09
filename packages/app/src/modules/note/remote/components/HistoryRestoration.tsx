import { ApolloCache, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';

import { EditorRevisionRecord } from '~collab/client/collab-editor';
import { UserRecords, ServerRecordsFacade } from '~collab/client/user-records';
import { RevisionChangeset } from '~collab/records/record';

import { gql } from '../../../../__generated__';
import { NoteTextField } from '../../../../__generated__/graphql';
import { useCurrentUserId } from '../../../auth/user';
import { collabTextRecordToEditorRevisionRecord } from '../../../collab/editor-graphql-mapping';
import { useNoteContentId } from '../context/NoteContentIdProvider';
import { useNoteCollabText } from '../context/NoteContentIdToCollabTextsProvider';

const QUERY = gql(`
  query HistoryRestoration($noteContentId: String!, $fieldName: NoteTextField!, 
                            $recordsBeforeRevision: NonNegativeInt!, $recordsLast: PositiveInt!, 
                            $tailRevision: NonNegativeInt! $skipTailRevision: Boolean!, $skipRecords: Boolean!){
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
          recordsConnection(before: $recordsBeforeRevision, last: $recordsLast) @skip(if: $skipRecords){
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

  const currentUserId = useCurrentUserId();

  useEffect(() => {
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

          const tailRevision = Math.max(0, recordsBeforeRevision - recordsLast - 1);
          const skipTailRevision = serverRecords.hasTextAt(tailRevision);
          const skipRecords = recordsLast === 0;

          if (skipRecords && skipTailRevision) return;

          const result = await apolloClient.query({
            query: QUERY,
            variables: {
              fieldName,
              noteContentId,
              recordsBeforeRevision,
              recordsLast: skipRecords ? 1 : recordsLast,
              tailRevision,
              skipTailRevision,
              skipRecords,
            },
          });
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (!result) return;

          result.data.note.textFields.forEach((textField) => {
            if (textField.key !== fieldName) return;
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
    currentUserId,
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
    return this.cache.readFragment({
      id: this.collabTextRef,
      fragment: FRAGMENT_RECORDS,
      variables,
    })?.recordsConnection.records;
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

  hasTextAt(revision: number) {
    return Boolean(this.readTextAtRevision(revision));
  }
}
