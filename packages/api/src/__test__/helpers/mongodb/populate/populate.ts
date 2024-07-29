import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

import { NoteCategory, NoteTextField } from '../../../../graphql/types.generated';
import { CollectionName } from '../../../../mongodb/collections';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { ShareNoteLinkSchema } from '../../../../mongodb/schema/share-note-link/share-note-link';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';

import { mongoCollections } from '../mongodb';

import { FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { populateQueue } from './populate-queue';

import { fakeShareNoteLink, FakeShareNoteLinkOptions } from './share-note-link';
import { fakeUser } from './user';
import {
  fakeUserNote,
  FakeUserNoteOptions,
  fakeUserNotePopulateQueue,
} from './user-note';

interface OptionsMeta {
  userNoteId: ObjectId;
}

export interface PopulateNotesOptions {
  user?: UserSchema;
  skipInsert?: {
    shareNoteLink?: boolean;
  };
  userNote?: (noteIndex: number, meta: OptionsMeta) => FakeUserNoteOptions | undefined;
  note?: (noteIndex: number, meta: OptionsMeta) => FakeNoteOptions | undefined;
  collabText?: (
    noteIndex: number,
    fieldName: NoteTextField,
    meta: OptionsMeta
  ) => FakeCollabTextOptions | undefined;
  shareNoteLink?: (noteIndex: number) => FakeShareNoteLinkOptions | undefined;
}

export function populateNotes(count: number, options?: PopulateNotesOptions) {
  const user = options?.user ?? fakeUser();

  const notes: NoteSchema[] = [];
  const userNotes: UserNoteSchema[] = [];
  const shareNoteLinks: ShareNoteLinkSchema[] = [];

  const data = [...new Array<undefined>(count)].map((_, noteIndex) => {
    const userNoteId = new ObjectId();

    const meta: OptionsMeta = {
      userNoteId,
    };

    const collabTextsOptionsByField = mapObject(NoteTextField, (_key, fieldName) => {
      return [fieldName, options?.collabText?.(noteIndex, fieldName, meta)];
    });

    const noteOptions = options?.note?.(noteIndex, meta);

    const note = fakeNote(user, {
      collabTexts: collabTextsOptionsByField,
      ...noteOptions,
      override: {
        userNotes: [
          {
            _id: userNoteId,
          },
        ],
        ...noteOptions?.override,
      },
    });
    notes.push(note);

    const customUserNoteOptions = options?.userNote?.(noteIndex, meta);
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
      shareNoteLink,
    };
  });

  populateQueue(() =>
    Promise.all([
      !options?.user && mongoCollections[CollectionName.USERS].insertOne(user),
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
    collabText(noteIndex, fieldName, meta) {
      const collabTextOptions = options?.collabText?.(noteIndex, fieldName, meta);
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
