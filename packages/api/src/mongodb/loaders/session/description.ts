import { InferRaw } from 'superstruct';
import { CollectionName, MongoDBCollectionsOnlyNames } from '../../collections';
import { DeepAnyDescription } from '../../query/description';
import { SessionSchema } from '../../schema/session';

export const QueryableSession = SessionSchema;

export interface QueryableSessionContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.SESSIONS>;
}

export const queryableSessionDescription: DeepAnyDescription<
  InferRaw<typeof QueryableSession>,
  unknown,
  QueryableSessionContext
> = {};
