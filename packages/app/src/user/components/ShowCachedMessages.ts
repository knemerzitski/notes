import { useApolloClient, useQuery } from '@apollo/client';

import { useEffect } from 'react';

import { gql } from '../../__generated__';
import { UserMessageType } from '../../__generated__/graphql';
import { ShowMessageOptions, useShowMessage } from '../../utils/context/show-message';
import { useUserId } from '../context/user-id';
import { removeUserMessages } from '../models/message/remove';

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

    function removeMessage() {
      if (!nextMessage) {
        return;
      }

      removeUserMessages(userId, [nextMessage.id], client.cache);
    }

    showMessage(nextMessage.text, {
      severity: mapSeverity(nextMessage.type),
      onShowing() {
        removeMessage();
      },
      onDone() {
        removeMessage();
      },
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
