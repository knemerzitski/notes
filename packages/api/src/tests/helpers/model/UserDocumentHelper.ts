import { faker } from '@faker-js/faker';
import { Require_id } from 'mongoose';
import { assert } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { NoteEdge } from '../../../graphql/types.generated';
import { DBNote } from '../../../mongoose/models/note';
import { UserDocument } from '../../../mongoose/models/user';
import { DBUserNote } from '../../../mongoose/models/user-note';
import { User, Note, UserNote } from '../mongoose';

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
        const textContent = faker.string.sample(120);
        return {
          ownerId: this.user._id,
          title: faker.string.sample(15),
          content: {
            latestRevision: 0,
            latestText: textContent,
            records: [
              {
                revision: 0,
                changeset: Changeset.fromInsertion(textContent),
              },
            ],
          },
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
              title: note.title,
              content: {
                revision: note.content.latestRevision,
                text: note.content.latestText,
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
