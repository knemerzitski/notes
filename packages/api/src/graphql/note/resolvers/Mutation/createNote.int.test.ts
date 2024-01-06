import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, mockFn } from 'vitest-mock-extended';

import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserDocumentHelper from '../../../../tests/helpers/model/UserDocumentHelper';
import UserModelHelper from '../../../../tests/helpers/model/UserModelHelper';
import {
  resetDatabase,
  User,
  UserNote,
  Note,
  testConnection,
} from '../../../../tests/helpers/mongoose';
import { GraphQLResolversContext } from '../../../context';
import { NotePatchInput } from '../../../types.generated';

import { createNote } from './createNote';

describe('createNote', () => {
  faker.seed(774);

  let userHelper: UserDocumentHelper;
  let context: GraphQLResolversContext;

  beforeEach(async () => {
    await resetDatabase();
    const userModelHelper = new UserModelHelper();
    userHelper = userModelHelper.getOrCreateUser(0);
    await userHelper.user.save();

    const mockContext = mockDeep<GraphQLResolversContext>({
      auth: {
        session: {
          user: {
            _id: userHelper.user._id,
          },
        },
      },
      mongoose: {
        model: {
          User,
          UserNote,
          Note,
        },
      },
      publish: mockFn,
    });

    context = {
      ...mockContext,
      mongoose: {
        ...mockContext.mongoose,
        connection: testConnection,
      },
    };
  });

  it('creates a new note', async () => {
    const newNote: NotePatchInput = {
      title: faker.string.sample(20),
      textContent: faker.string.sample(120),
    };

    const result = await mockResolver(createNote)(
      {},
      {
        input: {
          note: newNote,
        },
      },
      context
    );

    expect(result).containSubset({
      note: {
        title: newNote.title,
        textContent: newNote.textContent,
        preferences: {},
      },
    });
    assert(result != null);

    await expect(
      Note.findOne({
        publicId: result.note.id,
      })
    ).resolves.not.toBeNull();

    const userNote = await UserNote.findOne({
      userId: userHelper.user._id,
      notePublicId: result.note.id,
    });
    expect(userNote).not.toBeNull();
    assert(userNote !== null);

    await expect(userHelper.getUserNotesIds()).resolves.toStrictEqual([userNote._id]);
  });

  it('creates new note to the beginning of order', async () => {
    async function newNote() {
      const result = await mockResolver(createNote)(
        {},
        {
          input: {
            note: {
              title: faker.string.sample(20),
              textContent: faker.string.sample(120),
            },
          },
        },
        context
      );
      const note = result?.note;
      assert(note !== undefined);
      return note;
    }

    const note1 = await newNote();
    const note2 = await newNote();
    const note3 = await newNote();

    // Expecting last created note to be at the beginning
    const expectedNotesOrdered = [note3, note2, note1];

    const actualUserNotesIds = await userHelper.getUserNotesIds();
    const acutualUserNotes = await UserNote.find({
      _id: {
        $in: actualUserNotesIds,
      },
    });

    const orderedUserNotes = actualUserNotesIds.map((id) =>
      acutualUserNotes.find((userNote) => userNote._id.equals(id))
    );

    expect(orderedUserNotes.map((userNote) => userNote?.notePublicId)).toStrictEqual(
      expectedNotesOrdered.map((userNote) => userNote.id)
    );
  });
});
