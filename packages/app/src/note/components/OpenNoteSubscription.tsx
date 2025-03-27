import { useApolloClient, useQuery } from '@apollo/client';

import { useEffect } from 'react';

import { Listener } from '../../../../utils/src/async-event-queue';

import { gql } from '../../__generated__';
import { OpenNoteSubscriptionSubscriptionSubscription } from '../../__generated__/graphql';
import { useGetMutationUpdaterFn } from '../../graphql/context/get-mutation-updater-fn';
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

const OpenNoteSubscription_Query = gql(`
  query OpenNoteSubscription_Query($userBy: UserByInput!, $noteBy: NoteByInput!) {
    signedInUser(by: $userBy) {
      id
      note(by: $noteBy) {
        id
        users {
          id
        }
      }
    }
  }
`);

export function OpenNoteSubscription(props: Parameters<typeof IfHasMultipleUsers>[0]) {
  const isLocalOnlyNote = useIsLocalOnlyNote();

  if (isLocalOnlyNote) {
    return null;
  }

  return <IfHasMultipleUsers {...props} />;
}

function IfHasMultipleUsers({
  minRequiredUsers = 2,
  ...restProps
}: Parameters<typeof Subscription>[0] & {
  /**
   * Minimum amount of users required in a note to start OpenNoteSubscription
   * @default 2
   */
  minRequiredUsers?: number;
}) {
  const userId = useUserId();
  const noteId = useNoteId();

  const { data } = useQuery(OpenNoteSubscription_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      userBy: {
        id: userId,
      },
      noteBy: {
        id: noteId,
      },
    },
  });

  if (!data) {
    return null;
  }

  const haveEnoughUsers = data.signedInUser.note.users.length >= minRequiredUsers;
  if (!haveEnoughUsers) {
    return null;
  }

  return <Subscription {...restProps} />;
}

function Subscription({
  unsubscribeDelay,
  listener: mutationListener,
}: {
  unsubscribeDelay?: number;
  listener?: Listener<
    NonNullable<
      OpenNoteSubscriptionSubscriptionSubscription['openNoteEvents']['mutations']
    >[0]
  >;
}) {
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
            id: noteId,
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
        const mutations = value.data?.openNoteEvents.mutations;
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
      }, unsubscribeDelay);

      setOpenedNoteActive(getUserNoteLinkId(noteId, userId), false, client.cache);
    };
  }, [client, getMutationUpdaterFn, noteId, userId, unsubscribeDelay, mutationListener]);

  return null;
}
