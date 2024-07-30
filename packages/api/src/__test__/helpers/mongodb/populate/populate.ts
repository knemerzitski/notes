import mapObject from 'map-obj';

import { ObjectId } from 'mongodb';

import { NoteCategory, NoteTextField } from '../../../../graphql/types.generated';
import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';
import { UserNoteSchema } from '../../../../mongodb/schema/user-note/user-note';

import { mongoCollections } from '../mongodb';

import { FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { populateQueue } from './populate-queue';

import { FakeShareNoteLinkOptions } from './share-note-link';
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

  const data = [...new Array<undefined>(count)].map((_, noteIndex) => {
    const userNoteId = new ObjectId();

    const meta: OptionsMeta = {
      userNoteId,
    };

    const collabTextsOptionsByField = mapObject(NoteTextField, (_key, fieldName) => {
      return [fieldName, options?.collabText?.(noteIndex, fieldName, meta)];
    });

    const noteOptions = options?.note?.(noteIndex, meta);

    const shareNoteLinkOptions = !options?.skipInsert
      ? options?.shareNoteLink?.(noteIndex) ?? {}
      : undefined;

    const note = fakeNote(user, {
      collabTexts: collabTextsOptionsByField,
      shareNoteLinks: shareNoteLinkOptions ? [shareNoteLinkOptions] : undefined,
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

    return {
      userNote,
      note,
    };
  });

  populateQueue(() =>
    Promise.all([
      !options?.user && mongoCollections.users.insertOne(user),
      mongoCollections.notes.insertMany(notes),
      mongoCollections.userNotes.insertMany(userNotes),
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
    await mongoCollections.users.replaceOne(
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
