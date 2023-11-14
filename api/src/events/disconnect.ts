import { EventHandler } from '../webSocketSubscriptionHandler';

export const disconnect: EventHandler = async ({ context, event }) => {
  const { connectionId } = event.requestContext;
  context.logger.info('event:DISCONNECT', { connectionId });
  try {
    // TODO trigger event onDisconnect?

    const connectionSubscriptions =
      await context.models.subscriptions.queryAllByConnectionId(connectionId);

    const deletions = connectionSubscriptions.map(async (sub) => {
      // TODO trigger subscribe onComplete?

      await context.models.subscriptions.delete({ id: sub.id });
    });

    await context.models.connections.delete({ id: connectionId });
    await Promise.all(deletions);
  } catch (err) {
    context.logger.error('event:DISCONNECT', err as Error, { event });
    // TODO trigger event onError?
  }
};
