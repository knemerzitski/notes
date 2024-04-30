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
    done
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
        // console.log(
        //   'next',
        //   util.inspect(JSON.parse(JSON.stringify(value)), false, null, true)
        // );
        if (!value.data) return;

        value.data.noteUpdated.patch.textFields?.forEach(({ value }) => {
          const { id: collabTextId, newRecord } = value;
          if (!newRecord) return;

          // console.log(
          //   'write',
          //   util.inspect(JSON.parse(JSON.stringify(newRecord)), false, null, true)
          // );
          apolloClient.cache.writeFragment({
            id: apolloClient.cache.identify({
              id: collabTextId,
              __typename: 'CollabText',
            }),
            fragment: FRAGMENT,
            data: {
              unprocessedRecords: [
                {
                  done: null,
                  type: CollabTextUnprocessedRecordType.ExternalChange,
                  record: newRecord,
                },
              ],
            },
          });
        });
      },
    });

    return () => {
      sub.unsubscribe();
    };
  }, [apolloClient]);

  return null;
}
