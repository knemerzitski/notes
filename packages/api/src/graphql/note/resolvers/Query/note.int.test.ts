import { faker } from '@faker-js/faker';
import { assert, describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserDocumentHelper from '../../../../tests/helpers/model/UserDocumentHelper';
import UserModelHelper from '../../../../tests/helpers/model/UserModelHelper';
import { Note, UserNote, resetDatabase } from '../../../../tests/helpers/mongoose';
import { GraphQLResolversContext } from '../../../context';

import { note } from './note';

const USER_COUNT = 3;
const TOTAL_NOTES_COUNT = 20;

function createUserContext(userHelper: UserDocumentHelper) {
  return mockDeep<GraphQLResolversContext>({
    auth: {
      session: {
        user: {
          _id: userHelper.user._id,
        },
      },
    },
    mongoose: {
      model: {
        UserNote,
        Note,
      },
    },
  });
}

describe('note', async () => {
  faker.seed(5435);
  await resetDatabase();

  const userModelHelper = new UserModelHelper();

  userModelHelper.createUsers(USER_COUNT);
  await userModelHelper.createNotesRandomly(TOTAL_NOTES_COUNT, () =>
    faker.number.int({ min: 1, max: 3 })
  );

  const user1Helper = userModelHelper.users[0];
  const user2Helper = userModelHelper.users[1];
  const user3Helper = userModelHelper.users[2];
  assert(user1Helper !== undefined);
  assert(user2Helper !== undefined);
  assert(user3Helper !== undefined);

  // User 1 grant access to user 2 (last 3 notes)
  await user2Helper.addExistingNotes(user1Helper.noteData.slice(0, 3));
  const user2NotesFromUser1 = user2Helper.noteData.slice(-3, -1);

  it('returns user 1 own note by id', async () => {
    const expectedNoteData = user1Helper.noteData[1];
    assert(expectedNoteData !== undefined);

    const result = await mockResolver(note)(
      {},
      {
        id: String(expectedNoteData.edge.node.id),
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual(expectedNoteData.edge.node);
  });

  const user2NoteFromUser1 = user2NotesFromUser1[1];
  assert(user2NoteFromUser1 !== undefined);
  it('returns user 1 note to user 2 since user 2 has access to it', async () => {
    const result = await mockResolver(note)(
      {},
      {
        id: String(user2NoteFromUser1.edge.node.id),
      },
      createUserContext(user2Helper)
    );

    expect(result).toStrictEqual(user2NoteFromUser1.edge.node);
  });

  it(`throws error when user 3 tries to access user 1 note`, async () => {
    await expect(async () => {
      await mockResolver(note)(
        {},
        {
          id: String(user2NoteFromUser1.edge.node.id),
        },
        createUserContext(user3Helper)
      );
    }).rejects.toThrow();
  });
});
