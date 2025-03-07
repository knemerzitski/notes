import { Infer, InferRaw } from 'superstruct';

import { CollectionName } from '../../collection-names';
import { MongoDBCollectionsOnlyNames } from '../../collections';
import { DescriptionDeep } from '../../query/description';
import { SessionSchema } from '../../schema/session';

export const QueryableSession = SessionSchema;

export type QueryableSession = Infer<typeof QueryableSession>;

export interface QueryableSessionContext {
  collections: Pick<MongoDBCollectionsOnlyNames, CollectionName.SESSIONS>;
}

export const queryableSessionDescription: DescriptionDeep<
  InferRaw<typeof QueryableSession>,
  unknown,
  QueryableSessionContext
> = {};
