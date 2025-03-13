import { useApolloClient, useQuery } from '@apollo/client';

import { useEffect, useRef } from 'react';

import { gql } from '../../__generated__';
import { User, UserMessageType } from '../../__generated__/graphql';
import { ShowMessageOptions, useShowMessage } from '../../utils/context/show-message';
import { useUserId } from '../context/user-id';
import { removeUserMessages } from '../models/message/remove';

const ShowCachedMessages_Query = gql(`
  query ShowCachedMessages_Query($id: ObjectID!) {
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

  const lastOpenedMessageRef = useRef<{
    userId: User['id'];
    closeMessage: () => void;
  } | null>(null);

  const showMessage = useShowMessage();

  const messages = data?.signedInUser.local.messages;

  useEffect(() => {
    // If user changes while displaying a message, close it
    if (lastOpenedMessageRef.current) {
      const userChanged = lastOpenedMessageRef.current.userId !== userId;
      if (userChanged) {
        lastOpenedMessageRef.current.closeMessage();
        lastOpenedMessageRef.current = null;
      }
    }

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

    const closeMessage = showMessage(nextMessage.text, {
      severity: mapSeverity(nextMessage.type),
      onShowing() {
        removeMessage();
      },
      onDone() {
        removeMessage();
        lastOpenedMessageRef.current = null;
      },
    });

    lastOpenedMessageRef.current = {
      userId,
      closeMessage,
    };
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
