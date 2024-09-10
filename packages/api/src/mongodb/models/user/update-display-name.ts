import { ClientSession, Collection, ObjectId } from 'mongodb';
import { DBUserSchema } from '../../schema/user';

export interface UpdateDisplayNameParams {
  collection: Collection<DBUserSchema>;
  userId: ObjectId;
  displayName: string;
  session?: ClientSession;
}

export function updateDisplayName({
  userId,
  displayName,
  collection,
  session,
}: UpdateDisplayNameParams) {
  return collection.updateOne(
    {
      _id: userId,
    },
    {
      $set: {
        'profile.displayName': displayName,
      },
    },
    {
      session,
    }
  );
}
