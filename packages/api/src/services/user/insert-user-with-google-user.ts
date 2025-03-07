import { ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { insertUser as model_insertUser } from '../../mongodb/models/user/insert-user';
import { UserSchema } from '../../mongodb/schema/user';

export async function insertUserWithGoogleUser({
  id,
  displayName,
  mongoDB,
}: {
  id: string;
  displayName: string;
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'user'>;
  };
}) {
  const user = UserSchema.create({
    _id: new ObjectId(),
    thirdParty: {
      google: {
        id,
      },
    },
    profile: {
      displayName,
    },
  });

  await model_insertUser({
    user,
    mongoDB,
  });

  mongoDB.loaders.user.prime(
    {
      id: {
        googleUserId: id,
      },
    },
    user,
    {
      valueToQueryOptions: {
        fillStruct: UserSchema,
      },
    }
  );
  mongoDB.loaders.user.prime(
    {
      id: {
        userId: user._id,
      },
    },
    user,
    {
      valueToQueryOptions: {
        fillStruct: UserSchema,
      },
    }
  );

  return user;
}
