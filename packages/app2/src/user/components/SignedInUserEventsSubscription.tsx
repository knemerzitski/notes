import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useEffect } from 'react';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';

const SignedInUserEventsSubscription_Query = gql(`
  query SignedInUserEventsSubscription_Query {
    currentSignedInUser @client {
      localOnly
    }
  }
`);

// Subscribe to mutation payloads
const SignedInUserEventsSubscription_Subscription = gql(`
  subscription SignedInUserEventsSubscription_Subscription {
    signedInUserEvents {
      mutations {
        __typename
        ...UpdateSignedInUserDisplayNamePayload
      }
    }
  }  
`);

export function SignedInUserEventsSubscription() {
  const { data } = useQuery(SignedInUserEventsSubscription_Query);

  const localOnly = data?.currentSignedInUser.localOnly;

  const client = useApolloClient();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  useEffect(() => {
    if (localOnly) {
      // Do no subscribe as local user
      return;
    }

    const observable = client.subscribe({
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
            {}
          );
        }
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [client, getMutationUpdaterFn, localOnly]);

  return null;
}
