import { faker } from '@faker-js/faker';
import { GraphQLError } from 'graphql';
import { assert, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { createUserContext } from '../../../../tests/helpers/graphql-context';
import { mockResolver } from '../../../../tests/helpers/mock-resolver';
import UserDocumentHelper from '../../../../tests/helpers/model/UserDocumentHelper';
import UserModelHelper from '../../../../tests/helpers/model/UserModelHelper';
import { UserNote, Note, resetDatabase } from '../../../../tests/helpers/mongoose';

import { updateNote } from './updateNote';

describe.skip('updateNote', () => {
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

  it('updates both title and content', async () => {
    const newTitle = faker.string.sample(20);
    const newTextContent = faker.string.sample(20);

    const result = await mockResolver(updateNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
          patch: {
            title: newTitle,
            content: {
              targetRevision: 0,
              changeset: Changeset.fromInsertion(newTextContent),
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      id: user1Note.note.publicId,
      patch: {
        title: newTitle,
        content: {
          revision: 1,
          changeset: Changeset.fromInsertion(newTextContent),
        },
        preferences: {
          backgroundColor: undefined,
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
      content: {
        latestText: newTextContent,
        latestRevision: 1,
        records: [
          {
            changeset: user1Note.note.content.records[0]?.changeset.serialize(),
            revision: 0,
          },
          {
            changeset: [newTextContent],
            revision: 1,
          },
        ],
      },
    });
  });

  it('only content', async () => {
    const newTextContent = faker.string.sample(20);

    const result = await mockResolver(updateNote)(
      {},
      {
        input: {
          id: user1Note.note.publicId,
          patch: {
            content: {
              targetRevision: 0,
              changeset: Changeset.fromInsertion(newTextContent),
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      id: user1Note.note.publicId,
      patch: {
        title: undefined,
        content: {
          revision: 1,
          changeset: Changeset.fromInsertion(newTextContent),
        },
        preferences: {
          backgroundColor: undefined,
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
      content: {
        latestText: newTextContent,
        latestRevision: 1,
        records: [
          {
            changeset: user1Note.note.content.records[0]?.changeset.serialize(),
            revision: 0,
          },
          {
            changeset: [newTextContent],
            revision: 1,
          },
        ],
      },
    });
  });

  it('only backgroundColor', async () => {
    const newColor = faker.color.rgb();

    const result = await mockResolver(updateNote)(
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
      id: user1Note.note.publicId,
      patch: {
        title: undefined,
        content: undefined,
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

    const result = await mockResolver(updateNote)(
      {},
      {
        input: {
          id: user2NoteAccessibleByUser1.note.publicId,
          patch: {
            content: {
              targetRevision: 0,
              changeset: Changeset.fromInsertion(newTextContent),
            },
          },
        },
      },
      createUserContext(user1Helper)
    );

    expect(result).toStrictEqual({
      id: user2NoteAccessibleByUser1.note.publicId,
      patch: {
        title: undefined,
        content: {
          revision: 1,
          changeset: Changeset.fromInsertion(newTextContent),
        },
        preferences: {
          backgroundColor: undefined,
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
      content: {
        latestText: newTextContent,
        latestRevision: 1,
        records: [
          {
            changeset:
              user2NoteAccessibleByUser1.note.content.records[0]?.changeset.serialize(),
            revision: 0,
          },
          {
            changeset: [newTextContent],
            revision: 1,
          },
        ],
      },
    });
  });

  describe('throw error', () => {
    it('note that doesnt exist', async () => {
      await expect(
        mockResolver(updateNote)(
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
        mockResolver(updateNote)(
          {},
          {
            input: {
              id: readOnlyNote.note.publicId,
              patch: {
                textContent: 'impossible',
              },
            },
          },
          createUserContext(user1Helper)
        )
      ).rejects.toThrow(GraphQLError);
    });
  });
});
