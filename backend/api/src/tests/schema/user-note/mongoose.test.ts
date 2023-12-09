import { faker } from '@faker-js/faker';
import { beforeAll, describe, expect, it } from 'vitest';

import { NoteDocument } from '../../../schema/note/mongoose';
import { SessionDocument } from '../../../schema/session/mongoose';
import { UserDocument } from '../../../schema/user/mongoose';
import { model } from '../../helpers/mongoose';

describe('UserNote', () => {
  const { User, Session, Note, UserNote } = model;

  let user: UserDocument;
  let session: SessionDocument;
  let note: NoteDocument;

  beforeAll(async () => {
    user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });

    session = new Session({
      userId: user._id,
      expireAt: faker.date.future(),
    });

    note = new Note({
      ownerId: user._id,
      title: faker.string.sample(15),
      content: faker.string.sample(120),
    });

    await Promise.all([user.save(), session.save(), note.save()]);
  });

  describe('indexes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let indexes: any[];

    beforeAll(async () => {
      await UserNote.syncIndexes();
      indexes = await UserNote.listIndexes();
    });

    it('noteId', () => {
      expect(indexes).containSubset([
        {
          key: { noteId: 1 },
        },
      ]);
    });

    it('compound (userId, noteId, list.order) is unique', () => {
      expect(indexes).containSubset([
        {
          key: { userId: 1, noteId: 1, 'list.order': 1 },
          unique: true,
        },
      ]);
    });
  });

  it('will not save empty', async () => {
    const userNote = new UserNote();
    await expect(async () => {
      await userNote.save();
    }).rejects.toThrowError();
  });

  it('saves with required defined', async () => {
    const userNote = new UserNote({
      userId: user._id,
      noteId: note._id,
      list: {
        order: 'a',
      },
    });
    await userNote.save();
  });
});
