import { faker } from '@faker-js/faker';
import { Require_id } from 'mongoose';
import { assert } from 'vitest';

import { UserNoteEdge } from '../../../graphql/types.generated';
import { DBNote } from '../../../mongoose/models/note';
import { UserDocument } from '../../../mongoose/models/user';
import { DBUserNote } from '../../../mongoose/models/user-note';
import { User, Note, UserNote } from '../mongoose';

interface NoteData {
  edge: UserNoteEdge;
  userNote: Require_id<DBUserNote>;
  note: Require_id<DBNote>;
}

export default class UserDocumentHelper {
  user: UserDocument;
  noteData: NoteData[] = [];

  constructor() {
    this.user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
  }

  async createNotes(count: number) {
    const notes = await Note.insertMany(
      [...new Array(count).keys()].map(() => ({
        ownerId: this.user._id,
        title: faker.string.sample(15),
        textContent: faker.string.sample(120),
      }))
    );

    const userNotes = await UserNote.insertMany(
      notes.map((note) => ({
        userId: this.user._id,
        noteId: note._id,
        readOnly: !!faker.number.int({ min: 0, max: 1 }),
        preferences: {
          backgroundColor: '#000000',
        },
      }))
    );

    this.user.notes.category.default.order.unshift(
      ...userNotes.map((userNote) => userNote._id)
    );

    this.noteData.unshift(
      ...userNotes.map((_, i) => {
        const note = notes[i];
        assert(note !== undefined);
        const userNote = userNotes[i];
        assert(userNote !== undefined);
        return {
          note: note,
          userNote: userNote,
          edge: {
            cursor: String(userNote._id),
            node: {
              id: note.publicId,
              readOnly: userNote.readOnly,
              preferences: {
                backgroundColor: userNote.preferences?.backgroundColor,
              },
              note: {
                id: note.publicId,
                title: note.title,
                textContent: note.textContent,
              },
            },
          },
        };
      })
    );

    await this.user.save();
  }

  async addExistingNotes(existingNoteData: NoteData[]) {
    const userNotes = await UserNote.insertMany(
      existingNoteData.map((noteData) => ({
        userId: this.user._id,
        noteId: noteData.note._id,
        readOnly: !!faker.number.int({ min: 0, max: 1 }),
        preferences: {
          backgroundColor: '#000000',
        },
      }))
    );

    this.user.notes.category.default.order.unshift(
      ...userNotes.map((userNote) => userNote._id)
    );

    this.noteData.unshift(
      ...userNotes.map((_, i) => {
        const noteData = existingNoteData[i];
        assert(noteData !== undefined);
        const { note, edge } = noteData;
        const userNote = userNotes[i];
        assert(userNote !== undefined);
        return {
          note,
          userNote,
          edge: {
            ...edge,
            cursor: String(userNote._id),
            node: {
              ...edge.node,
              readOnly: userNote.readOnly,
              preferences: {
                ...edge.node.preferences,
                backgroundColor: userNote.preferences?.backgroundColor,
              },
            },
          },
        };
      })
    );

    await this.user.save();
  }
}
