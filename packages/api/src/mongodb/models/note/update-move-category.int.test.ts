/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  mongoCollections,
  resetDatabase,
} from '../../../__tests__/helpers/mongodb/mongodb';
import { populateExecuteAll } from '../../../__tests__/helpers/mongodb/populate/populate-queue';
import { fakeUserPopulateQueue } from '../../../__tests__/helpers/mongodb/populate/user';
import { DBUserSchema } from '../../schema/user';

import { updateMoveCategory } from './update-move-category';

let user: DBUserSchema;
const danglingNoteId = 'dangling';

beforeEach(async () => {
  faker.seed(5343);
  await resetDatabase();

  user = fakeUserPopulateQueue({
    override: {
      note: {
        categories: {
          default: {
            noteIds: ['1', '2', '3', '4'] as any,
          },
          archive: {
            noteIds: ['a', 'b', 'c', 'd'] as any,
          },
        },
      },
    },
  });

  await populateExecuteAll();
});

async function getDbNoteIds(category: string) {
  const dbUser = await mongoCollections.users.findOne({
    _id: user._id,
  });
  return dbUser?.note.categories[category]?.noteIds;
}

describe('same category', () => {
  it('left to right, after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '1' as any,
      noteIndex: 0,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['2', '3', '1', '4']);
  });

  it('left to right, before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '1' as any,
      noteIndex: 0,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['2', '1', '3', '4']);
  });

  it('right to left, after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteIndex: 2,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 0,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '3', '2', '4']);
  });

  it('right to left, before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteIndex: 2,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 0,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['3', '1', '2', '4']);
  });

  it('anchor points to same index, after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteIndex: 2,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 1,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4']);
  });

  it('anchor points to same index, before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '2' as any,
      noteIndex: 1,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4']);
  });

  it('anchor self, after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteIndex: 2,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4']);
  });

  it('anchor self, before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteIndex: 2,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4']);
  });
});

describe('from one category to other', () => {
  it('before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'archive',
      noteId: '2' as any,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '3', '4']);
    expect(await getDbNoteIds('archive')).toEqual(['a', 'b', '2', 'c', 'd']);
  });

  it('after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'archive',
      noteId: '2' as any,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
      anchor: {
        index: 2,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '3', '4']);
    expect(await getDbNoteIds('archive')).toEqual(['a', 'b', 'c', '2', 'd']);
  });
});

describe('not in any category', () => {
  it('before', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: danglingNoteId as any,
      noteUser: {
        _id: user._id,
        categoryName: 'unknown',
      },
      anchor: {
        index: 2,
        position: 'before',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', danglingNoteId, '3', '4']);
  });

  it('after', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: danglingNoteId as any,
      noteUser: {
        _id: user._id,
        categoryName: 'unknown',
      },
      anchor: {
        index: 2,
        position: 'after',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', danglingNoteId, '4']);
  });
});

describe('no anchor', () => {
  it('not in any category, pushes to end', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: danglingNoteId as any,
      noteUser: {
        _id: user._id,
        categoryName: 'unknown',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4', danglingNoteId]);
  });

  it('in same category, no change', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: '3' as any,
      noteUser: {
        _id: user._id,
        categoryName: 'default',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4']);
  });

  it('in different category, pushes to end', async () => {
    await updateMoveCategory({
      mongoDB: {
        collections: mongoCollections,
      },
      categoryName: 'default',
      noteId: 'a' as any,
      noteUser: {
        _id: user._id,
        categoryName: 'archive',
      },
    });

    expect(await getDbNoteIds('default')).toEqual(['1', '2', '3', '4', 'a']);
    expect(await getDbNoteIds('archive')).toEqual(['b', 'c', 'd']);
  });
});
