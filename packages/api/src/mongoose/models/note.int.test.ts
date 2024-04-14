import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Changeset } from '~collab/changeset/changeset';

import { Note, User } from '../../test/helpers/mongoose';

import { NoteDocument } from './note';
import { UserDocument } from './user';

describe.skip('Note', () => {
  let user: UserDocument;

  beforeAll(async () => {
    user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
    await user.save();
  });

  describe('indexes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexes = await Note.listIndexes();

    it('publicId is unique', () => {
      expect(indexes).containSubset([
        {
          key: { publicId: 1 },
          unique: true,
        },
      ]);
    });
  });

  it('requires ownerId (userId)', async () => {
    const note = new Note();

    await expect(async () => {
      await note.save();
    }).rejects.toThrowError();
  });

  it('saves empty', async () => {
    const note = new Note({
      ownerId: user._id,
    });

    await note.save();

    const fetchedNote = await Note.findById(note._id);

    expect(fetchedNote?.toObject()).toStrictEqual(note.toObject());
  });

  it('has _id before saving', async () => {
    const note = new Note({
      ownerId: user._id,
    });
    const id = String(note.id);
    expect(note._id).toBeDefined();

    await note.save();
    expect(note.id).toStrictEqual(id);
  });

  describe('title', () => {
    it('saves', async () => {
      const title = faker.string.sample(15);
      const note = new Note({
        ownerId: user._id,
        title,
      });
      await note.save();

      const fetchedNote = await Note.findById(note._id);

      expect(fetchedNote?.toObject()).containSubset({
        title,
      });
    });

    it('is trimmed', async () => {
      const title = faker.string.sample(15);
      const note = new Note({
        ownerId: user._id,
        title: `  ${title}    `,
      });
      await note.save();

      const fetchedNote = await Note.findById(note._id);

      expect(fetchedNote?.toObject()).containSubset({
        title,
      });
    });
  });

  it('saves textContent as is', async () => {
    const textContent = faker.string.sample(120);
    const note = new Note({
      ownerId: user._id,
      textContent,
    });
    await note.save();

    const fetchedNote = await Note.findById(note._id);

    expect(fetchedNote?.toObject()).containSubset({
      textContent,
    });
  });

  describe('save', () => {
    let newNote: NoteDocument;

    beforeEach(async () => {
      newNote = new Note({
        ownerId: user._id,
      });
      await newNote.save();
    });

    it('generates publicId', () => {
      expect(newNote.publicId).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(newNote.publicId.length).toBeGreaterThan(15);
    });
  });

  it('user can be owner of multiple notes', async () => {
    await Note.insertMany([
      {
        ownerId: user._id,
        title: faker.string.sample(15),
        textContent: faker.string.sample(120),
      },
      {
        ownerId: user._id,
        title: faker.string.sample(15),
        textContent: faker.string.sample(120),
      },
    ]);
  });

  it.only('content is a collaborative document', async () => {
    const note = new Note({
      ownerId: user._id,
      content: {
        latestText: 'initial doc',
        latestRevision: 0,
        records: [
          {
            revision: 1,
            changeset: Changeset.parseValue([[0, 10], 'append']),
          },
        ],
      },
    });
    await note.save();

    const fetchedNote = (await Note.findById(note._id))?.toObject();

    expect(fetchedNote?.content).toStrictEqual({
      latestText: 'initial doc',
      latestRevision: 0,
      records: [
        {
          revision: 1,
          changeset: [[0, 10], 'append'],
        },
      ],
    });
  });
});
