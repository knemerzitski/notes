import { pick } from 'superstruct';
import { UserSchema } from '../../../mongodb/schema/user';
import { MongoQueryFn } from '../../../mongodb/query/query';

const UserSchema_id_profile = pick(UserSchema, ['_id', 'profile']);

export interface SignedInUserMapper {
  readonly query: MongoQueryFn<typeof UserSchema_id_profile>;
}
export interface PublicUserMapper {
  readonly query: MongoQueryFn<typeof UserSchema_id_profile>;
}

export interface PublicUserProfileMapper {
  readonly query: MongoQueryFn<typeof UserSchema.schema.profile>;
}
