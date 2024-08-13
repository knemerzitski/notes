import { NoteSchema } from '../../../../mongodb/schema/note/note';
import { UserSchema } from '../../../../mongodb/schema/user/user';

import { mongoCollections } from '../mongodb';

import { FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { fakeNoteUser, FakeNoteUserOptions } from './note-user';
import { populateQueue } from './populate-queue';

import { fakeShareNoteLink, FakeShareNoteLinkOptions } from './share-note-link';
import { fakeUser } from './user';

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
  noteUser?: (noteIndex: number) => FakeNoteUserOptions | undefined;
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

    const noteUser = fakeNoteUser(user, options?.noteUser?.(noteIndex));

    const noteOptions = options?.note?.(noteIndex);
    const note = fakeNote(user, {
      collabTexts: collabTextsOptionsByField,
      ...noteOptions,
      override: {
        users: [noteUser],
        shareNoteLinks: shareNoteLink ? [shareNoteLink] : undefined,
        ...noteOptions?.override,
      },
    });
    notes.push(note);

    userAddNote(user, note);

    return {
      note,
      noteUser,
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
  noteUser?: FakeNoteUserOptions;
}

// TODO remove this, use only userAddNote
export function populateUserAddNote(
  user: UserSchema,
  note: NoteSchema,
  options?: PopulateAddNoteToUserOptions
) {
  userAddNote(user, note, options?.noteUser);

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

export function userAddNote(
  user: UserSchema,
  note: NoteSchema,
  options?: FakeNoteUserOptions
) {
  let noteUser = note.users.find(({ _id: userId }) => userId.equals(user._id));
  if (!noteUser) {
    noteUser = fakeNoteUser(user, options);
    note.users.push(noteUser);
  }

  const categoryName = noteUser.categoryName;
  let categoryMeta = user.notes.category[categoryName];
  if (!categoryMeta) {
    categoryMeta = {
      order: [],
    };
    user.notes.category[categoryName] = categoryMeta;
  }
  categoryMeta.order.push(note._id);
}
