import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

import { NoteCategory, NoteTextField } from '../../../../graphql/types.generated';
import { CollectionName } from '../../../../mongodb/collections';
import {
  CollabTextSchema,
  CollabTextUserNoteSchema,
} from '../../../../mongodb/schema/collab-text';
import { NoteSchema } from '../../../../mongodb/schema/note';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note';

import { mongoCollections } from '../mongodb';

import { fakeCollabText, FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { populateQueue } from './populate-queue';

import { fakeShareNoteLink, FakeShareNoteLinkOptions } from './share-note-link';
import { fakeUser } from './user';
import {
  fakeUserNote,
  FakeUserNoteOptions,
  fakeUserNotePopulateQueue,
} from './user-note';

export interface PopulateNotesOptions {
  user?: UserSchema;
  skipInsert?: {
    shareNoteLink?: boolean;
  };
  userNote?: (noteIndex: number) => FakeUserNoteOptions | undefined;
  note?: (noteIndex: number) => FakeNoteOptions | undefined;
  collabText?: (
    noteIndex: number,
    fieldName: NoteTextField
  ) => FakeCollabTextOptions | undefined;
  shareNoteLink?: (noteIndex: number) => FakeShareNoteLinkOptions | undefined;
}

export function populateNotes(count: number, options?: PopulateNotesOptions) {
  const user = options?.user ?? fakeUser();

  const collabTexts: CollabTextSchema[] = [];
  const notes: NoteSchema[] = [];
  const userNotes: UserNoteSchema[] = [];
  const shareNoteLinks: ShareNoteLinkSchema[] = [];

  const data = [...new Array<undefined>(count)].map((_, noteIndex) => {
    const userNoteId = new ObjectId();
    const collabTextUserNote: CollabTextUserNoteSchema = {
      id: userNoteId,
      userId: user._id,
    };

    const collabTextsByField = mapObject(NoteTextField, (_key, fieldName) => {
      const collabText = fakeCollabText(
        collabTextUserNote,
        options?.collabText?.(noteIndex, fieldName)
      );

      collabTexts.push(collabText);

      return [fieldName, collabText];
    });

    const note = fakeNote(user, collabTextsByField, options?.note?.(noteIndex));
    notes.push(note);

    const customUserNoteOptions = options?.userNote?.(noteIndex);
    const userNote = fakeUserNote(user, note, {
      ...customUserNoteOptions,
      override: {
        _id: userNoteId,
        ...customUserNoteOptions?.override,
      },
    });
    userNotes.push(userNote);

    addUserNoteToUser(user, userNote);

    const shareNoteLink = fakeShareNoteLink(
      userNote,
      options?.shareNoteLink?.(noteIndex)
    );
    if (!options?.skipInsert?.shareNoteLink) {
      shareNoteLinks.push(shareNoteLink);
    }

    return {
      userNote,
      note,
      collabTextsByField,
      shareNoteLink,
    };
  });

  populateQueue(() =>
    Promise.all([
      !options?.user && mongoCollections[CollectionName.USERS].insertOne(user),
      mongoCollections[CollectionName.COLLAB_TEXTS].insertMany(collabTexts),
      mongoCollections[CollectionName.NOTES].insertMany(notes),
      mongoCollections[CollectionName.USER_NOTES].insertMany(userNotes),
      shareNoteLinks.length > 0 &&
        mongoCollections[CollectionName.SHARE_NOTE_LINKS].insertMany(shareNoteLinks),
    ])
  );

  return {
    user,
    data,
  };
}

export interface PopulateNotesWithTextParams {
  user?: UserSchema;
}

export function populateNotesWithText(
  texts: { [key in NoteTextField]?: string }[],
  options?: PopulateNotesOptions
) {
  return populateNotes(texts.length, {
    ...options,
    collabText(noteIndex, fieldName) {
      const collabTextOptions = options?.collabText?.(noteIndex, fieldName);
      return {
        initialText: texts[noteIndex]?.[fieldName],
        ...collabTextOptions,
      };
    },
  });
}

export interface PopulateAddNoteToUserOptions {
  userNote?: FakeUserNoteOptions;
}

export function populateAddNoteToUser(
  user: UserSchema,
  note: NoteSchema,
  options?: PopulateAddNoteToUserOptions
) {
  const userNote = fakeUserNotePopulateQueue(user, note, options?.userNote);

  addUserNoteToUser(user, userNote);

  populateQueue(async () => {
    await mongoCollections[CollectionName.USERS].replaceOne(
      {
        _id: user._id,
      },
      user
    );
  });
}

function addUserNoteToUser(user: UserSchema, userNote: UserNoteSchema) {
  const categoryName = userNote.category?.name ?? NoteCategory.DEFAULT;
  let categoryMeta = user.notes.category[categoryName];
  if (!categoryMeta) {
    categoryMeta = {
      order: [],
    };
    user.notes.category[categoryName] = categoryMeta;
  }
  categoryMeta.order.push(userNote._id);
}
