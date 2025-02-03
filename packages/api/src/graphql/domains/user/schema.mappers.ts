import { ObjectId } from 'mongodb';

import { MongoQueryFn } from '../../../mongodb/query/query';
import { UserSchema } from '../../../mongodb/schema/user';
import { ResolverTypeWrapper } from '../types.generated';

export interface UserMapper {
  readonly userId: ResolverTypeWrapper<ObjectId>;
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}

export interface PublicUserMapper {
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}

export interface UserProfileMapper {
  readonly query: MongoQueryFn<UserSchema['profile']>;
}
