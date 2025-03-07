import { ObjectId } from 'mongodb';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
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
    mongoDB,
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
      _id: userId,
      profile: {
        displayName,
      },
    }
  );
}
