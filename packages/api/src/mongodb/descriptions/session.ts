import { CollectionName, MongoDBCollectionsOnlyNames } from '../collections';
import { DeepAnyDescription } from '../query/description';
import { SessionSchema } from '../schema/session';

export type QueryableSession = SessionSchema;

export interface QueryableSessionContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.SESSIONS>;
}

export const queryableSessionDescription: DeepAnyDescription<
  QueryableSession,
  unknown,
  QueryableSessionContext
> = {};
