import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';
import { mockDeep, mockFn } from 'vitest-mock-extended';

import { mockResolver } from '../../../../test/helpers/mock-resolver';
import UserDocumentHelper from '../../../../test/helpers/mongodb/_model/UserDocumentHelper';
import UserModelHelper from '../../../../test/helpers/mongodb/_model/UserModelHelper';
import {
  resetDatabase,
  User,
  UserNote,
  Note,
  connection,
} from '../../../../test/helpers/mongodb';
import { GraphQLResolversContext } from '../../../context';

import { deleteNote } from './deleteNote';

function createContext(userHelper: UserDocumentHelper) {
  const mockContext = mockDeep<GraphQLResolversContext>({
    auth: {
      session: {
        user: {
          _id: userHelper.user._id.toString('base64'),
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
    publish: mockFn(),
  });

  const context: GraphQLResolversContext = {
    ...mockContext,
    mongoose: {
      ...mockContext.mongoose,
      connection: connection,
    },
  };
  return context;
}

describe.skip('deleteNote', () => {
  faker.seed(774);

  let userModelHelper: UserModelHelper;
  let user1Helper: UserDocumentHelper;
  let user2Helper: UserDocumentHelper;

  beforeEach(async () => {
    await resetDatabase();

    userModelHelper = new UserModelHelper();
    userModelHelper.createUsers(2);

    user1Helper = userModelHelper.getUser(0);
    user2Helper = userModelHelper.getUser(1);
    await Promise.all([user1Helper.createNotes(3), user2Helper.createNotes(3)]);
  });

  it('deletes owner note, note is deleted for everyone', async () => {
    const user1Note = user1Helper.noteData[1];
    assert(user1Note !== undefined);
    await user2Helper.addExistingNotes([user1Note]);
    await userModelHelper.saveUsers();

    const result = await mockResolver(deleteNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
        },
      },
      createContext(user1Helper)
    );

    expect(result).toStrictEqual({
      deleted: true,
    });

    await expect(
      Note.findOne({
        publicId: user1Note.note.publicId,
      })
    ).resolves.toBeNull();

    await expect(
      UserNote.findOne({
        userId: user1Helper.user._id._id,
        publicId: user1Note.note.publicId,
      })
    ).resolves.toBeNull();

    await expect(
      UserNote.findOne({
        userId: user2Helper.user._id._id,
        publicId: user1Note.note.publicId,
      })
    ).resolves.toBeNull();

    await expect(user1Helper.getUserNotesIds()).resolves.not.toContain(
      user1Note.userNote._id
    );
    await expect(user2Helper.getUserNotesIds()).resolves.not.toContain(
      user1Note.userNote._id
    );
  });

  it('unlinks note if not owner, note is not deleted', async () => {
    const user2NoteAccessibleByUser1 = user2Helper.noteData[1];
    assert(user2NoteAccessibleByUser1 !== undefined);
    await user1Helper.addExistingNotes([user2NoteAccessibleByUser1]);

    const notePublicId = user2NoteAccessibleByUser1.note.publicId;

    const result = await mockResolver(deleteNote)(
      {},
      {
        input: {
          id: notePublicId,
        },
      },
      createContext(user1Helper)
    );

    expect(result).toStrictEqual({
      deleted: true,
    });

    // Note still exists
    await expect(
      Note.findOne({
        publicId: notePublicId,
      })
    ).resolves.not.toBeNull();

    // user1 UserNote is deleted
    await expect(
      UserNote.findOne({
        userId: user1Helper.user._id,
        notePublicId: notePublicId,
      })
    ).resolves.toBeNull();

    // user2 UserNote exists
    await expect(
      UserNote.findOne({
        userId: user2Helper.user._id,
        notePublicId: notePublicId,
      })
    ).resolves.not.toBeNull();

    // user1 doesn't have deleted note in order
    await expect(user1Helper.getUserNotesIdsString()).resolves.not.toContain(
      user2NoteAccessibleByUser1.userNote._id.toString()
    );

    // user2 has note
    await expect(user2Helper.getUserNotesIdsString()).resolves.toContain(
      user2NoteAccessibleByUser1.userNote._id.toString()
    );
  });

  it('deletes usernote even if db is inconsistent and note is missing', async () => {
    const notePublicId = 'missing';

    const userNote = new UserNote({
      userId: user1Helper.user._id,
      notePublicId,
    });
    await userNote.save();

    const result = await mockResolver(deleteNote)(
      {},
      {
        input: {
          id: notePublicId,
        },
      },
      createContext(user1Helper)
    );

    expect(result).toStrictEqual({
      deleted: true,
    });

    // UserNote is deleted
    await expect(
      UserNote.findOne({
        userId: user1Helper.user._id,
        notePublicId,
      })
    ).resolves.toBeNull();
  });

  it('throws error if deleting note that doesnt exist', async () => {
    await expect(
      mockResolver(deleteNote)(
        {},
        {
          input: {
            id: 'nonexistant',
          },
        },
        createContext(user1Helper)
      )
    ).rejects.toThrow(GraphQLError);
  });

  it('throws error deleting note you dont have access to', async () => {
    const user2Note = user2Helper.noteData[1];
    assert(user2Note !== undefined);

    await expect(
      mockResolver(deleteNote)(
        {},
        {
          input: {
            id: user2Note.note.publicId,
          },
        },
        createContext(user1Helper)
      )
    ).rejects.toThrow(GraphQLError);
  });
});
