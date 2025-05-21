import { useApolloClient } from '@apollo/client';

import { useEffect } from 'react';

import { Listener } from '../../../../utils/src/async-event-queue';

import { gql } from '../../__generated__';
import { SignedInUserEventsSubscriptionSubscriptionSubscription } from '../../__generated__/graphql';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';
import { apolloClientSubscribe } from '../../graphql/utils/apollo-client-subscribe';
import { useUserId } from '../context/user-id';
import { useIsLocalOnlyUser } from '../hooks/useIsLocalOnlyUser';

const SignedInUserEventsSubscription_Subscription = gql(`
  subscription SignedInUserEventsSubscription_Subscription($input: SignedInUserEventsInput!) {
    signedInUserEvents(input: $input) {
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

export function SignedInUserEventsSubscription(
  props: Parameters<typeof Subscription>[0]
) {
  const isLocalOnlyUser = useIsLocalOnlyUser();

  if (isLocalOnlyUser) {
    return null;
  }

  return <Subscription {...props} />;
}

function Subscription({
  listener: mutationListener,
}: {
  listener?: Listener<
    NonNullable<
      SignedInUserEventsSubscriptionSubscriptionSubscription['signedInUserEvents']['mutations']
    >[0]
  >;
}) {
  const client = useApolloClient();
  const userId = useUserId();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  useEffect(() => {
    const observable = apolloClientSubscribe(client, {
      query: SignedInUserEventsSubscription_Subscription,
      variables: {
        input: {
          authUser: {
            id: userId,
          },
        },
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
          try {
            mutationListener?.(mutation);
          } catch (err) {
            console.error(err);
          }

          const update = getMutationUpdaterFn(mutation.__typename);
          update?.(
            client.cache,
            {
              ...value,
              data: mutation,
            },
            {
              context: {
                ...client.defaultContext,
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
  }, [client, getMutationUpdaterFn, userId, mutationListener]);

  return null;
}
