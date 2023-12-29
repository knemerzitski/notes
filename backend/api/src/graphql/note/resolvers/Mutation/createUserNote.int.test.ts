import { faker } from '@faker-js/faker';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

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

import { createUserNote } from './createUserNote';

describe('createUserNote', () => {
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
    });

    context = {
      ...mockContext,
      mongoose: {
        ...mockContext.mongoose,
        connection: testConnection,
      },
    };
  });

  it('creates a new note for existing user', async () => {
    const newNote: NotePatchInput = {
      title: faker.string.sample(20),
      textContent: faker.string.sample(120),
    };

    const result = await mockResolver(createUserNote)(
      {},
      {
        input: {
          newNote,
        },
      },
      context
    );

    expect(result).containSubset({
      note: {
        note: {
          title: newNote.title,
          textContent: newNote.textContent,
        },
        preferences: {},
      },
    });
  });

  it('inserts new note to the beginning of order', async () => {
    async function createNote() {
      const result = await mockResolver(createUserNote)(
        {},
        {
          input: {
            newNote: {
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

    const note1 = await createNote();
    const note2 = await createNote();
    const note3 = await createNote();

    const user = await User.findById(userHelper.user._id);
    assert(user !== null);
    const actualOrder = user.notes.category.default.order;

    const userNotes = await UserNote.find();

    const expectedOrder = [note3, note2, note1].map(
      (note) => userNotes.find((userNote) => userNote.notePublicId === note.id)?._id
    );

    expect(actualOrder).toStrictEqual(expectedOrder);
  });
});
