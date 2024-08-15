import { MongoQuery } from '../../../mongodb/query/query';
import { UserSchema } from '../../../mongodb/schema/user/user';
import { PublicUserMapper } from '../schema.mappers';

type QueryablePublicUser = Pick<UserSchema, '_id' | 'profile'>;

export class PublicUserQueryMapper implements PublicUserMapper {
  private readonly publicUser: MongoQuery<QueryablePublicUser>;

  constructor(publicUser: MongoQuery<QueryablePublicUser>) {
    this.publicUser = publicUser;
  }
  async id() {
    const publicUser = await this.publicUser.query({
      _id: 1,
    });
    return publicUser?._id;
  }

  async displayName() {
    const publicUser = await this.publicUser.query({
      profile: { displayName: 1 },
    });
    return publicUser?.profile?.displayName;
  }
}
