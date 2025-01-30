import { ObjectId } from 'mongodb';

import { MongoQueryFn } from '../../../mongodb/query/query';
import { UserSchema } from '../../../mongodb/schema/user';

export interface SignedInUserMapper {
  readonly userId: ObjectId;
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}
export interface PublicUserMapper {
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}

export interface PublicUserProfileMapper {
  readonly query: MongoQueryFn<UserSchema['profile']>;
}
