import { useApolloClient } from '@apollo/client';

import { useEffect } from 'react';

import { gql } from '../../__generated__';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';
import { GlobalOperationVariables } from '../../graphql/types';
import { apolloClientSubscribe } from '../../graphql/utils/apollo-client-subscribe';
import { useUserId } from '../context/user-id';
import { useIsLocalOnlyUser } from '../hooks/useIsLocalOnlyUser';

const SignedInUserEventsSubscription_Subscription = gql(`
  subscription SignedInUserEventsSubscription_Subscription {
    signedInUserEvents {
      mutations {
        ...UpdateSignedInUserDisplayNamePayload
        ...CreateNotePayload
        ...UpdateNoteInsertRecordPayload
        ...TrashUserNoteLinkPayload
        ...MoveUserNoteLinkPayload
        ...DeleteNotePayload
        ...ShareNotePayload
        ...DeleteShareNotePayload
        ...CreateNoteLinkByShareAccessPayload
        ...OpenNoteUserSubscribedEvent
        ...OpenNoteUserUnsubscribedEvent
        ...UpdateOpenNoteSelectionRangePayload
      }
    }
  }  
`);

export function SignedInUserEventsSubscription() {
  const isLocalOnlyUser = useIsLocalOnlyUser();

  if (isLocalOnlyUser) {
    return null;
  }

  return <Subscription />;
}

function Subscription() {
  const client = useApolloClient();
  const userId = useUserId();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  useEffect(() => {
    const observable = apolloClientSubscribe(client, {
      query: SignedInUserEventsSubscription_Subscription,
      variables: {
        // Force a new subscription when user changes
        // @ts-expect-error Is is a valid variable locally
        [GlobalOperationVariables.USER_ID]: userId,
      },
    });

    let subscriptionStopped = false;
    const subscription = observable.subscribe({
      next(value) {
        if (subscriptionStopped) {
          return;
        }

        const mutations = value.data?.signedInUserEvents.mutations;
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
      });
    };
  }, [client, getMutationUpdaterFn, userId]);

  return null;
}
