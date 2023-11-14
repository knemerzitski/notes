import { MongooseSubscriptionContext } from '../schema/resolvers';
import { SubscribeEvent } from '../pubsub/subscribe';

export function buildSubscriptionContext(): MongooseSubscriptionContext<SubscribeEvent> {
  return {
    subscribe: (topic: string) => ({ topic }),
  };
}
