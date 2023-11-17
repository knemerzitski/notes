import { Connection as MongooseConnection } from 'mongoose';

import { Publisher } from '../pubsub/publish';
import { Subscriber } from '../pubsub/subscribe';

export interface MongooseQueryMutationContext {
  mongoose: MongooseConnection;
  publish: Publisher;
}

export interface MongooseSubscriptionContext<TReturn = unknown> {
  subscribe: Subscriber<TReturn>;
}

export const queryMutationResolvers = {
  Query: {
    async items(_parent: unknown, _args: unknown, context: MongooseQueryMutationContext) {
      const Item = context.mongoose.model('Item');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await Item.find();
    },
    async item(
      _parent: unknown,
      { id }: { id: string },
      { mongoose }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await Item.findById(id);
    },
  },
  Mutation: {
    async insertItem(
      _parent: unknown,
      { name }: { name: string },
      { mongoose, publish }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const newItem = new Item({ name, done: false });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await newItem.save();

      await publish('ITEM_CREATED', {
        itemCreated: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: newItem.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          name: newItem.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          done: newItem.done,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return newItem;
    },
    async updateItem(
      _parent: unknown,
      { id, name, done }: { id: string; name?: string; done?: boolean },
      { mongoose, publish }: MongooseQueryMutationContext
    ): Promise<boolean> {
      const Item = mongoose.model('Item');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const updatedItem = await Item.findByIdAndUpdate(id, { name, done });

      await publish('ITEM_UPDATED', {
        itemUpdated: {
          id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          name: name ?? updatedItem.name,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          done: done ?? updatedItem.done,
        },
      });

      return true;
    },
    async deleteItem(
      _parent: unknown,
      { id }: { id: string },
      { mongoose, publish }: MongooseQueryMutationContext
    ) {
      const Item = mongoose.model('Item');

      await Item.findByIdAndDelete(id);

      await publish('ITEM_REMOVED', {
        itemRemoved: id,
      });

      return true;
    },
  },
};

export const subscriptionResolvers = {
  Subscription: {
    itemCreated: {
      subscribe(
        _parent: unknown,
        _args: unknown,
        { subscribe }: MongooseSubscriptionContext
      ) {
        return subscribe('ITEM_CREATED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
    itemUpdated: {
      subscribe(
        _parent: unknown,
        _args: unknown,
        { subscribe }: MongooseSubscriptionContext
      ) {
        return subscribe('ITEM_UPDATED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
    itemRemoved: {
      subscribe(
        _parent: unknown,
        _args: unknown,
        { subscribe }: MongooseSubscriptionContext
      ) {
        return subscribe('ITEM_REMOVED');
      },
      resolve(payload: unknown) {
        return payload;
      },
    },
  },
};
