import { MessageType } from 'graphql-ws';

import { MessageHandler } from '../message-handler';

/**
 * Removes subscription item from DynamoDB table; id `${connectionId}:${message.id}`
 */
export function createCompleteHandler(): MessageHandler<MessageType.Complete> {
  return async ({ context, event, message }) => {
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

    return Promise.resolve(undefined);
  };
}
