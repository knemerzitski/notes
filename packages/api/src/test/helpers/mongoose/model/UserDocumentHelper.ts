// TODO remove file, use populate instead
import { faker } from '@faker-js/faker';
import { Require_id } from 'mongoose';
import { assert } from 'vitest';

import { newDocumentInsertion } from '~collab/adapters/mongodb/multi-field-document-server';

import { NoteEdge } from '../../../../graphql/types.generated';
import { DBNote } from '../../../../mongoose/models/note';
import { UserDocument } from '../../../../mongoose/models/user';
import { DBUserNote } from '../../../../mongoose/models/user-note';
import { User, Note, UserNote } from '../../mongoose';

interface NoteData {
  edge: NoteEdge;
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

  async createNotes(count: number, readOnly: boolean | undefined = undefined) {
    const notes = await Note.insertMany(
      [...new Array(count).keys()].map(() => {
        return {
          ownerId: this.user._id,
          title: newDocumentInsertion(faker.string.sample(15)),
          content: newDocumentInsertion(faker.string.sample(120)),
        };
      })
    );

    const userNotes = await UserNote.insertMany(
      notes.map((note) => ({
        userId: this.user._id,
        notePublicId: note.publicId,
        readOnly: readOnly ?? !!faker.number.int({ min: 0, max: 1 }),
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
              title: {
                latestText: note.title.latestText,
                latestRevision: note.title.latestRevision,
              },
              content: {
                latestText: note.content.latestText,
                latestRevision: note.content.latestRevision,
              },
              readOnly: userNote.readOnly,
              preferences: {
                backgroundColor: userNote.preferences?.backgroundColor,
              },
            },
          },
        };
      })
    );

    await this.user.save();
  }

  async addExistingNotes(
    existingNoteData: NoteData[],
    readOnly: boolean | undefined = undefined
  ) {
    const userNotes = await UserNote.insertMany(
      existingNoteData.map((noteData) => ({
        userId: this.user._id,
        notePublicId: noteData.note.publicId,
        readOnly: readOnly ?? !!faker.number.int({ min: 0, max: 1 }),
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

  async find() {
    const user = await User.findById(this.user._id);
    assert(user !== null);
    return user;
  }

  async getUserNotesIds() {
    return (await this.find()).notes.category.default.order;
  }

  async getUserNotesIdsString() {
    return (await this.getUserNotesIds()).map((objId) => String(objId));
  }
}