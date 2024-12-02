import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useEffect } from 'react';
import { ShowMessageOptions, useShowMessage } from '../../utils/context/show-message';
import { removeUserMessages } from '../models/message/remove';
import { useUserId } from '../context/user-id';
import { UserMessageType } from '../../__generated__/graphql';

const ShowCachedMessages_Query = gql(`
  query ShowCachedMessages_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        messages  {
          id
          type
          text
        }
      }
    }
  }
`);

export function ShowCachedUserMessages() {
  const client = useApolloClient();

  const userId = useUserId();
  const { data } = useQuery(ShowCachedMessages_Query, {
    variables: {
      id: userId,
    },
  });

  const showMessage = useShowMessage();

  const messages = data?.signedInUser?.local.messages;

  useEffect(() => {
    if (!messages) {
      return;
    }
    const nextMessage = messages[messages.length - 1];
    if (!nextMessage) {
      return;
    }

    showMessage(nextMessage.text, {
      severity: mapSeverity(nextMessage.type),
      onDone() {
        // remove also when have shown long enoudh
        removeUserMessages(userId, [nextMessage.id], client.cache);
      },
      // TODO callback when showing message for some time?
    });
  }, [client, messages, userId, showMessage]);

  return null;
}

function mapSeverity(type: UserMessageType): ShowMessageOptions['severity'] {
  switch (type) {
    case UserMessageType.ERROR:
      return 'error';
    case UserMessageType.WARNING:
      return 'warning';
  }
}