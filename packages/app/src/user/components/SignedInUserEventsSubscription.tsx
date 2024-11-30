import { useApolloClient } from '@apollo/client';
import { gql } from '../../__generated__';
import { useEffect } from 'react';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';
import { apolloClientSubscribe } from '../../graphql/utils/apollo-client-subscribe';
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
        ...DeleteNotePayload
        ...CreateNoteLinkByShareAccessPayload
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
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  useEffect(() => {
    const observable = apolloClientSubscribe(client, {
      query: SignedInUserEventsSubscription_Subscription,
    });

    const subscription = observable.subscribe({
      next(value) {
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
      subscription.unsubscribe();
    };
  }, [client, getMutationUpdaterFn]);

  return null;
}
