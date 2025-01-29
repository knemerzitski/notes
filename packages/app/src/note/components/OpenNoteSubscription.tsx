import { useApolloClient } from '@apollo/client';

import { useEffect } from 'react';

import { gql } from '../../__generated__';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';
import { GlobalOperationVariables } from '../../graphql/types';
import { apolloClientSubscribe } from '../../graphql/utils/apollo-client-subscribe';
import { useUserId } from '../../user/context/user-id';
import { useNoteId } from '../context/note-id';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';
import { setOpenedNoteActive } from '../models/opened-note/set-active';
import { getUserNoteLinkId } from '../utils/id';

export const openNoteSubscriptionOperationName = 'OpenNoteSubscription_Subscription';

const OpenNoteSubscription_Subscription = gql(`
  subscription OpenNoteSubscription_Subscription($input: OpenNoteEventsInput!) {
    openNoteEvents(input: $input) {
      mutations {
        ...UpdateOpenNoteSelectionRangePayload
      }
    }
  }  
`);

export function OpenNoteSubscription({
  unsubscribeDelay = 0,
}: {
  unsubscribeDelay?: number;
}) {
  const isLocalOnlyNote = useIsLocalOnlyNote();

  if (isLocalOnlyNote) {
    return null;
  }

  return <Subscription delay={unsubscribeDelay} />;
}

function Subscription({ delay }: { delay: number }) {
  const client = useApolloClient();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();
  const noteId = useNoteId();
  const userId = useUserId();

  useEffect(() => {
    const observable = apolloClientSubscribe(client, {
      query: OpenNoteSubscription_Subscription,
      variables: {
        input: {
          authUser: {
            id: userId,
          },
          note: {
            id: noteId
          }
        },
        // Force a new subscription when user changes
        [GlobalOperationVariables.USER_ID]: userId,
      },
    });

    let subscriptionStopped = false;
    const subscription = observable.subscribe({
      next(value) {
        if (subscriptionStopped) {
          return;
        }
        const mutations = value.data?.openNoteEvents.mutations;
        if (!mutations) {
          return;
        }

        for (const mutation of mutations) {
          const update = getMutationUpdaterFn(mutation.__typename);
          update?.(
            client.cache,
            {
              ...value,
              data: mutation,
            },
            {
              context: {
                isSubscriptionOperation: true,
              },
            }
          );
        }
      },
    });

    return () => {
      subscriptionStopped = true;
      setTimeout(() => {
        subscription.unsubscribe();
      }, delay);

      setOpenedNoteActive(getUserNoteLinkId(noteId, userId), false, client.cache);
    };
  }, [client, getMutationUpdaterFn, noteId, userId, delay]);

  return null;
}
