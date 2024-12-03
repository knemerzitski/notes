import { ObjectId } from 'mongodb';

import { createRaw } from 'superstruct';

import { MongoDBCollections, CollectionName } from '../../collections';
import { DBShareNoteLinkSchema, ShareNoteLinkSchema } from '../../schema/share-note-link';
import { TransactionContext } from '../../utils/with-transaction';

export async function insertShareLink({
  mongoDB,
  noteId,
  shareLink,
}: {
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    collections: Pick<MongoDBCollections, CollectionName.NOTES>;
  };
  noteId: ObjectId;
  shareLink: ShareNoteLinkSchema | DBShareNoteLinkSchema;
}) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  shareLink = createRaw(shareLink, ShareNoteLinkSchema);

  return runSingleOperation((session) =>
    mongoDB.collections.notes.updateOne(
      {
        _id: noteId,
      },
      {
        $push: {
          shareLinks: shareLink,
        },
      },
      {
        session,
      }
    )
  );
}
