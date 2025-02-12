import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';

import { mongoCollections } from '../mongodb';

import { FakeCollabTextOptions } from './collab-text';
import { fakeNote, FakeNoteOptions } from './note';
import { fakeNoteUser, FakeNoteUserOptions } from './note-user';
import { populateQueue } from './populate-queue';

import { fakeShareNoteLink, FakeShareNoteLinkOptions } from './share-note-link';
import { fakeUser } from './user';

export enum TestNoteCategory {
  MAIN = 'main',
  OTHER = 'other',
}

export interface PopulateNotesOptions {
  user?: DBUserSchema;
  skipInsert?: {
    shareNoteLink?: boolean;
  };
  /**
   * @default [CollabTextKey]
   */
  noteUser?: (noteIndex: number) => FakeNoteUserOptions | undefined;
  note?: (noteIndex: number) => FakeNoteOptions | undefined;
  collabText?: (noteIndex: number) => FakeCollabTextOptions | undefined;
  shareLink?: (noteIndex: number) => FakeShareNoteLinkOptions | undefined;
}

export function populateNotes(count: number, options?: PopulateNotesOptions) {
  const user = options?.user ?? fakeUser();

  const notes: DBNoteSchema[] = [];

  const data = [...new Array<undefined>(count)].map((_, noteIndex) => {
    const shareLink = !options?.skipInsert
      ? fakeShareNoteLink(user, options?.shareLink?.(noteIndex))
      : undefined;

    const noteUser = fakeNoteUser(user, options?.noteUser?.(noteIndex));

    const noteOptions = options?.note?.(noteIndex);
    const note = fakeNote(user, {
      collabText: options?.collabText?.(noteIndex),
      ...noteOptions,
      override: {
        users: [noteUser],
        shareLinks: shareLink ? [shareLink] : undefined,
        ...noteOptions?.override,
      },
    });
    notes.push(note);

    userAddNote(user, note);

    return {
      note,
      noteUser,
      shareNoteLink: shareLink,
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
  user?: DBUserSchema;
}

export function populateNotesWithText(texts: string[], options?: PopulateNotesOptions) {
  return populateNotes(texts.length, {
    ...options,
    collabText(noteIndex) {
      const collabTextOptions = options?.collabText?.(noteIndex);
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
  user: DBUserSchema,
  note: DBNoteSchema,
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
  user: DBUserSchema,
  note: DBNoteSchema,
  options?: FakeNoteUserOptions
) {
  let noteUser = note.users.find(({ _id: userId }) => userId.equals(user._id));
  if (!noteUser) {
    noteUser = fakeNoteUser(user, options);
    note.users.push(noteUser);
  }

  const categoryName = noteUser.categoryName;
  let categoryMeta = user.note.categories[categoryName];
  if (!categoryMeta) {
    categoryMeta = {
      noteIds: [],
    };
    user.note.categories[categoryName] = categoryMeta;
  }
  if (!categoryMeta.noteIds.includes(note._id)) {
    categoryMeta.noteIds.push(note._id);
  }
}
