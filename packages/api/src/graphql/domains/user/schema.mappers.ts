import { MongoQueryFn } from '../../../mongodb/query/query';
import { UserSchema } from '../../../mongodb/schema/user';
import { AuthenticatedContext } from '../../../services/auth/authentication-context';

export interface SignedInUserMapper {
  /**
   * Authentication context of current SignedInUser type
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
