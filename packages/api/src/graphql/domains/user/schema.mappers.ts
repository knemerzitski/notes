import { MongoQueryFn } from '../../../mongodb/query/query';
import { UserSchema } from '../../../mongodb/schema/user';
import { AuthenticatedContext } from '../../../services/auth/types';

export interface SignedInUserMapper {
  /**
   * Requiring `AuthenticatedContext` instead of directly`userId` ensures
   * that access to `SignedInUser` is authorized.
   */
  readonly auth: AuthenticatedContext;

  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}
export interface PublicUserMapper {
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}

export interface PublicUserProfileMapper {
  readonly query: MongoQueryFn<UserSchema['profile']>;
}
