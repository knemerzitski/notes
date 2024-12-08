import { NewModelParams, Table, newModel } from '../model';

interface Key {
  // Subscription id
  id: string;
}

/**
 * Stores subscriptions that have been completed before subscribe function has finished processing
 */
export interface CompletedSubscription extends Key {
  // Time to live in seconds, after which record is deleted
  ttl: number;
}

export type CompletedSubscriptionTable = Table<Key, CompletedSubscription>;

export function newCompletedSubscriptionModel(
  newTableArgs: NewModelParams
): CompletedSubscriptionTable {
  const table = newModel<Key, CompletedSubscription>(newTableArgs);

  return table;
}
