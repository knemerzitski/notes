import { useEffect } from 'react';

import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { CollabTextUnprocessedRecordType } from '../../../__generated__/graphql';

export const SUBSCRIPTION = gql(`
  subscription CurrentUserExternalChangesNewRecord {
    noteUpdated {
      patch {
        id
        textFields {
          value {
            id
            newRecord {
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
        }
      }
    }
  }
`);

const FRAGMENT = gql(`
fragment CurrentUserExternalChangesWriteUnprocessedRecord on CollabText {
  unprocessedRecords {
    type
    record {
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

/**
 * Subscribe to noteUpdated of current user notes and add records to unprocessedRecords.
 */
export default function CurrentUserExternalChangesSubscription() {
  const apolloClient = useApolloClient();

  useEffect(() => {
    const observable = apolloClient.subscribe({
      query: SUBSCRIPTION,
    });

    const sub = observable.subscribe({
      next(value) {
        if (!value.data) return;

        value.data.noteUpdated.patch.textFields?.forEach(({ value }) => {
          const { id: collabTextId, newRecord } = value;
          if (!newRecord) return;

          apolloClient.cache.updateFragment(
            {
              id: apolloClient.cache.identify({
                id: collabTextId,
                __typename: 'CollabText',
              }),
              fragment: FRAGMENT,
            },
            (data) => {
              return {
                unprocessedRecords: [
                  ...(data?.unprocessedRecords ?? []),
                  {
                    type: CollabTextUnprocessedRecordType.ExternalChange,
                    record: newRecord,
                  },
                ],
              };
            }
          );
        });
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient]);

  return null;
}
