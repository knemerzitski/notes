import { faker } from '@faker-js/faker';
import { beforeAll, describe, expect, it } from 'vitest';

import { Note, User, UserNote } from '../../test/helpers/mongoose';

import { NoteDocument } from './note';
import { UserDocument } from './user';

describe.skip('UserNote', () => {
  let user: UserDocument;
  let note: NoteDocument;

  beforeAll(async () => {
    user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });

    note = new Note({
      ownerId: user._id,
      title: faker.string.sample(15),
      textContent: faker.string.sample(120),
    });

    await Promise.all([user.save(), note.save()]);
  });

  describe('indexes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexes = await UserNote.listIndexes();

    it('(userId, notePublicId) unique', () => {
      expect(indexes).containSubset([
        {
          key: { userId: 1, notePublicId: 1 },
          unique: true,
        },
      ]);
    });
  });

  it('throws error when saving empty', async () => {
    const userNote = new UserNote();
    await expect(async () => {
      await userNote.save();
    }).rejects.toThrowError();
  });

  it('saves with required defined', async () => {
    const userNote = new UserNote({
      userId: user._id,
      notePublicId: note.publicId,
    });
    await userNote.save();
  });
});
