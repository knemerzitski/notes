import { faker } from '@faker-js/faker';
import { assert } from 'vitest';

import { UserNoteEdge } from '../../../graphql/types.generated';
import { UserDocument } from '../../../mongoose/models/user';
import { User, Note, UserNote } from '../mongoose';

export default class UserDocumentHelper {
  user: UserDocument;
  noteEdges: UserNoteEdge[] = [];

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

    this.noteEdges.unshift(
      ...userNotes.map((_, i) => {
        const note = notes[i];
        assert(note !== undefined);
        const userNote = userNotes[i];
        assert(userNote !== undefined);
        return {
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
        };
      })
    );

    await this.user.save();
  }
}
