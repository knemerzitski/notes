import { MongoQueryFn } from '../../mongodb/query/query';
import { UserSchema } from '../../mongodb/schema/user/user';

export interface PublicUserMapper {
  readonly query: MongoQueryFn<Pick<UserSchema, '_id' | 'profile'>>;
}
