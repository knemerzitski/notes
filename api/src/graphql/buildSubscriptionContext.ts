import { SubscribeEvent } from '../pubsub/subscribe';
import { MongooseSubscriptionContext } from '../schema/resolvers';

export function buildSubscriptionContext(): MongooseSubscriptionContext<SubscribeEvent> {
  return {
    subscribe: (topic: string) => ({ topic }),
  };
}
