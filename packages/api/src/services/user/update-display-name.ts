import { ObjectId } from 'mongodb';
import { MongoDBCollections, CollectionName } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { updateDisplayName as mongoDB_updateDisplayName } from '../../mongodb/models/user/update-display-name';

export interface UpdateDisplayNameParams {
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'user'>;
  };
  userId: ObjectId;
  displayName: string;
}

export async function updateDisplayName({
  mongoDB,
  userId,
  displayName,
}: UpdateDisplayNameParams) {
  await mongoDB_updateDisplayName({
    userId,
    displayName,
    collection: mongoDB.collections.users,
  });

  mongoDB.loaders.user.prime(
    {
      id: {
        userId,
      },
      query: {
        _id: 1,
        profile: {
          displayName: 1,
        },
      },
    },
    {
      result: {
        _id: userId,
        profile: {
          displayName,
        },
      },
      type: 'validated',
    },
    {
      clearCache: true,
    }
  );
}
