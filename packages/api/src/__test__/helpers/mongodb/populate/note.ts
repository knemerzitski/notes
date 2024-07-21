import mapObject, { mapObjectSkip } from 'map-obj';
import { ObjectId } from 'mongodb';

import { NoteTextField } from '../../../../graphql/types.generated';

import { CollectionName } from '../../../../mongodb/collections';
import { CollabTextSchema } from '../../../../mongodb/schema/collab-text';
import { noteDefaultValues, NoteSchema } from '../../../../mongodb/schema/note';
import { UserSchema } from '../../../../mongodb/schema/user';
import { mongoCollections } from '../mongodb';
import { DeepPartial } from '../types';

import { populateQueue } from './populate-queue';

export interface FakeNoteOptions {
  override?: DeepPartial<NoteSchema>;
}

export function fakeNote(
  ownerUser: Pick<UserSchema, '_id'>,
  collabTexts: { [key in NoteTextField]?: Pick<CollabTextSchema, '_id'> },
  options?: FakeNoteOptions
): NoteSchema {
  return {
    _id: new ObjectId(),
    ownerId: ownerUser._id,
    publicId: noteDefaultValues.publicId(),
    collabTextIds: mapObject(collabTexts, (fieldName, collabText) => {
      if (!collabText) return mapObjectSkip;
      return [fieldName, collabText._id];
    }),
    ...options?.override,
  };
}

export const fakeNotePopulateQueue: typeof fakeNote = (
  ownerUser,
  collabTexts,
  options
) => {
  const note = fakeNote(ownerUser, collabTexts, options);

  populateQueue(async () => {
    await mongoCollections[CollectionName.NOTES].insertOne(note);
  });

  return note;
};
