import { Collection, ObjectId } from 'mongodb';
import { DBUserSchema } from '../../schema/user';

export interface UpdateDisplayNameParams {
  collection: Collection<DBUserSchema>;
  userId: ObjectId;
  displayName: string;
}

export function updateDisplayName({
  userId,
  displayName,
  collection,
}: UpdateDisplayNameParams) {
  return collection.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        'profile.displayName': displayName,
      },
    }
  );
}
