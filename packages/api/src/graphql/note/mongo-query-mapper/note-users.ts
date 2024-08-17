import { ObjectId } from 'mongodb';
import { DeepQueryResult, MongoQuery } from '../../../mongodb/query/query';
import { QueryableNote } from '../../../mongodb/schema/note/query/queryable-note';
import { NoteUserMapper } from '../schema.mappers';
import { PublicUserQueryMapper } from '../../user/mappers/public-user';

type GetUser = (
  users: NonNullable<DeepQueryResult<QueryableNote['users']>>
) => NonNullable<DeepQueryResult<QueryableNote['users']>>[0] | undefined;

export const createGetUserByIndex: (index: number) => GetUser = (index) => {
  return (users) => {
    return users[index];
  };
};

export const createGetUserByMatch: (userId: ObjectId) => GetUser = (userId) => {
  return (users) => {
    return users.find((user) => userId.equals(user._id));
  };
};

export class NoteUsersQueryMapper implements NoteUserMapper {
  private readonly currentUserId: ObjectId;
  private readonly users: MongoQuery<QueryableNote['users']>;
  private readonly getUser: GetUser;

  constructor(
    currentUserId: ObjectId,
    getUser: GetUser,
    users: MongoQuery<QueryableNote['users']>
  ) {
    this.currentUserId = currentUserId;
    this.getUser = getUser;
    this.users = users;
  }

  user() {
    return new PublicUserQueryMapper({
      query: async (query) => {
        const { _id, ...restQuery } = query;
        const users = await this.users.query({
          ...(_id != null && { _id }),
          user: restQuery,
        });
        if (!users) return;

        const user = this.getUser(users);
        if (!user) return;

        return {
          _id: user._id,
          profile: user.user?.profile,
        };
      },
    });
  }

  async higherScope() {
    const users = await this.users.query({
      _id: 1,
      createdAt: 1,
    });
    if (!users) return;

    const user = this.getUser(users);
    if (user?.createdAt == null) return;

    const currentNoteUser = users.find(({ _id: userId }) =>
      this.currentUserId.equals(userId)
    );

    // Self doesn't have higher scope
    if (this.currentUserId.equals(user._id)) return false;

    if (currentNoteUser?.createdAt == null) return;

    return user.createdAt < currentNoteUser.createdAt;
  }

  async readOnly() {
    const users = await this.users.query({
      _id: 1,
      readOnly: 1,
    });
    if (!users) return;

    const user = this.getUser(users);

    return user?.readOnly;
  }
}
