import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../events/message';

/**
 * Removes subscription item from DynamoDB table; id `${connectionId}:${message.id}`
 * @param param0
 */
export const complete: MessageHandler<MessageType.Complete> = async ({
  context,
  event,
  message,
}) => {
  const { connectionId } = event.requestContext;
  context.logger.info('message:complete', {
    connectionId,
  });
  try {
    // const subscription = await context.models.subscription.get({
    //   id: `${connectionId}:${message.id}`,
    // });
    // if (!subscription) {
    //   return;
    // }

    // TODO trigger subscribe onComplete?

    await context.models.subscriptions.delete({ id: `${connectionId}:${message.id}` });
  } catch (err) {
    context.logger.error('message:complete', err as Error, {
      connectionId,
      message,
    });
    throw err;
  }

  return Promise.resolve();
};
