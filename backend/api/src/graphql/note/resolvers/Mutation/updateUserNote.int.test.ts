import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';

import { createUserContext } from '../../../../tests/helpers/graphql-context';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserDocumentHelper from '../../../../tests/helpers/model/UserDocumentHelper';
import UserModelHelper from '../../../../tests/helpers/model/UserModelHelper';
import { UserNote, Note, resetDatabase } from '../../../../tests/helpers/mongoose';

import { updateUserNote } from './updateUserNote';

describe('updateUserNote', () => {
  faker.seed(5435);

  let userModelHelper: UserModelHelper;
  let user1Helper: UserDocumentHelper;
  let user2Helper: UserDocumentHelper;

  let user1Note: UserDocumentHelper['noteData'][0];

  beforeEach(async () => {
    await resetDatabase();

    userModelHelper = new UserModelHelper();
    userModelHelper.createUsers(2);

    user1Helper = userModelHelper.getUser(0);
    user2Helper = userModelHelper.getUser(1);
    await Promise.all([
      user1Helper.createNotes(3, false),
      user2Helper.createNotes(3, false),
    ]);

    const tmpUser1Note = user1Helper.noteData[1];
    assert(tmpUser1Note !== undefined);
    user1Note = tmpUser1Note;
  });

  it('both title and textContent', async () => {
    const newTitle = faker.string.sample(20);
    const newTextContent = faker.string.sample(20);

    const result = await mockResolver(updateUserNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
          patch: {
            note: {
              title: newTitle,
              textContent: newTextContent,
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      note: {
        id: user1Note.note.publicId,
        note: {
          id: user1Note.note.publicId,
          title: newTitle,
          textContent: newTextContent,
        },
        preferences: {
          backgroundColor: user1Note.edge.node.preferences.backgroundColor,
        },
      },
    });

    await expect(
      Note.findOne({
        _id: user1Note.note._id,
      }).lean()
    ).resolves.toStrictEqual({
      __v: 0,
      _id: user1Note.note._id,
      ownerId: user1Note.note.ownerId,
      publicId: user1Note.note.publicId,
      title: newTitle,
      textContent: newTextContent,
    });
  });

  it('only textContent', async () => {
    const newTextContent = faker.string.sample(20);

    const result = await mockResolver(updateUserNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
          patch: {
            note: {
              textContent: newTextContent,
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      note: {
        id: user1Note.note.publicId,
        note: {
          id: user1Note.note.publicId,
          title: user1Note.note.title,
          textContent: newTextContent,
        },
        preferences: {
          backgroundColor: user1Note.edge.node.preferences.backgroundColor,
        },
      },
    });

    await expect(
      Note.findOne({
        _id: user1Note.note._id,
      }).lean()
    ).resolves.toStrictEqual({
      __v: 0,
      _id: user1Note.note._id,
      ownerId: user1Note.note.ownerId,
      publicId: user1Note.note.publicId,
      title: user1Note.note.title,
      textContent: newTextContent,
    });
  });

  it('only backgroundColor', async () => {
    const newColor = faker.color.rgb();

    const result = await mockResolver(updateUserNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
          patch: {
            preferences: {
              backgroundColor: newColor,
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      note: {
        id: user1Note.note.publicId,
        note: {
          id: user1Note.note.publicId,
          title: user1Note.note.title,
          textContent: user1Note.note.textContent,
        },
        preferences: {
          backgroundColor: newColor,
        },
      },
    });

    await expect(
      UserNote.findOne({
        _id: user1Note.userNote._id,
      }).lean()
    ).resolves.toStrictEqual({
      __v: 0,
      _id: user1Note.userNote._id,
      notePublicId: user1Note.userNote.notePublicId,
      preferences: {
        backgroundColor: newColor,
      },
      readOnly: user1Note.userNote.readOnly,
      userId: user1Note.userNote.userId,
    });
  });

  it('note owned by another user, updates textContent', async () => {
    const user2NoteAccessibleByUser1 = user2Helper.noteData[1];
    assert(user2NoteAccessibleByUser1 !== undefined);
    await user1Helper.addExistingNotes([user2NoteAccessibleByUser1], false);

    const newTextContent = faker.string.sample(20);

    const result = await mockResolver(updateUserNote)(
      {},
      {
        input: {
          id: user2NoteAccessibleByUser1.note.publicId,
          patch: {
            note: {
              textContent: newTextContent,
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      note: {
        id: user2NoteAccessibleByUser1.note.publicId,
        note: {
          id: user2NoteAccessibleByUser1.note.publicId,
          title: user2NoteAccessibleByUser1.note.title,
          textContent: newTextContent,
        },
        preferences: {
          backgroundColor:
            user2NoteAccessibleByUser1.edge.node.preferences.backgroundColor,
        },
      },
    });

    await expect(
      Note.findOne({
        _id: user2NoteAccessibleByUser1.note._id,
      }).lean()
    ).resolves.toStrictEqual({
      __v: 0,
      _id: user2NoteAccessibleByUser1.note._id,
      ownerId: user2NoteAccessibleByUser1.note.ownerId,
      publicId: user2NoteAccessibleByUser1.note.publicId,
      title: user2NoteAccessibleByUser1.note.title,
      textContent: newTextContent,
    });
  });

  describe('throw error', () => {
    it('note that doesnt exist', async () => {
      await expect(
        mockResolver(updateUserNote)(
          {},
          {
            input: {
              id: 'nonexistant',
            },
          },
          createUserContext(user1Helper)
        )
      ).rejects.toThrow(GraphQLError);
    });

    it('read-only note', async () => {
      await user1Helper.createNotes(1, true);
      const readOnlyNote = user1Helper.noteData[0];
      assert(readOnlyNote !== undefined);
      assert(readOnlyNote.userNote.readOnly === true);

      await expect(
        mockResolver(updateUserNote)(
          {},
          {
            input: {
              id: readOnlyNote.note.publicId,
              patch: {
                note: {
                  textContent: 'impossible',
                },
              },
            },
          },
          createUserContext(user1Helper)
        )
      ).rejects.toThrow(GraphQLError);
    });
  });
});
