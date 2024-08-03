import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';

import { mongoCollections } from '../mongodb';

import { FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { populateQueue } from './populate-queue';

import { fakeShareNoteLink, FakeShareNoteLinkOptions } from './share-note-link';
import { fakeUser } from './user';
import { fakeUserNote, FakeUserNoteOptions } from './user-note';

export enum TestCollabTextKey {
  TEXT = 'text',
}

export enum TestNoteCategory {
  MAIN = 'main',
  OTHER = 'other',
}

export interface PopulateNotesOptions {
  user?: UserSchema;
  skipInsert?: {
    shareNoteLink?: boolean;
  };
  /**
   * @default [CollabTextKey]
   */
  collabTextKeys?: string[];
  userNote?: (noteIndex: number) => FakeUserNoteOptions | undefined;
  note?: (noteIndex: number) => FakeNoteOptions | undefined;
  collabText?: (
    noteIndex: number,
    fieldName: string
  ) => FakeCollabTextOptions | undefined;
  shareNoteLink?: (noteIndex: number) => FakeShareNoteLinkOptions | undefined;
}

export function populateNotes(count: number, options?: PopulateNotesOptions) {
  const user = options?.user ?? fakeUser();

  const notes: NoteSchema[] = [];

  const collabTextKeys = options?.collabTextKeys ?? Object.values(TestCollabTextKey);

  const data = [...new Array<undefined>(count)].map((_, noteIndex) => {
    const collabTextsOptionsByField = Object.fromEntries(
      collabTextKeys.map((fieldName) => [
        fieldName,
        options?.collabText?.(noteIndex, fieldName),
      ])
    );

    const shareNoteLink = !options?.skipInsert
      ? fakeShareNoteLink(user, options?.shareNoteLink?.(noteIndex))
      : undefined;

    const userNote = fakeUserNote(user, options?.userNote?.(noteIndex));

    const noteOptions = options?.note?.(noteIndex);
    const note = fakeNote(user, {
      collabTexts: collabTextsOptionsByField,
      ...noteOptions,
      override: {
        userNotes: [userNote],
        shareNoteLinks: shareNoteLink ? [shareNoteLink] : undefined,
        ...noteOptions?.override,
      },
    });
    notes.push(note);

    addUserNoteToUser(user, note);

    return {
      note,
      userNote,
      shareNoteLink,
    };
  });

  populateQueue(() =>
    Promise.all([
      !options?.user && mongoCollections.users.insertOne(user),
      mongoCollections.notes.insertMany(notes),
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

export function populateNotesWithText(texts: string[], options?: PopulateNotesOptions) {
  return populateNotes(texts.length, {
    ...options,
    collabText(noteIndex, fieldName) {
      const collabTextOptions = options?.collabText?.(noteIndex, fieldName);
      return {
        initialText: texts[noteIndex],
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
  addUserNoteToUser(user, note, options?.userNote);

  populateQueue(() => {
    return Promise.all([
      mongoCollections.users.replaceOne(
        {
          _id: user._id,
        },
        user
      ),
      mongoCollections.notes.replaceOne(
        {
          _id: note._id,
        },
        note
      ),
    ]);
  });
}

function addUserNoteToUser(
  user: UserSchema,
  note: NoteSchema,
  options?: FakeUserNoteOptions
) {
  let userNote = note.userNotes.find(({ userId }) => userId.equals(user._id));
  if (!userNote) {
    userNote = fakeUserNote(user, options);
    note.userNotes.push(userNote);
  }

  const categoryName = userNote.categoryName;
  let categoryMeta = user.notes.category[categoryName];
  if (!categoryMeta) {
    categoryMeta = {
      order: [],
    };
    user.notes.category[categoryName] = categoryMeta;
  }
  categoryMeta.order.push(note._id);
}
