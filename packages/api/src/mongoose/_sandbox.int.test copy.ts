import { describe, beforeEach, it } from 'vitest';
import { mongoDb } from '../tests/helpers/mongoose';

import util from 'util';

describe('sandbox', () => {
  const collection = mongoDb.collection('sandbox');

  beforeEach(async () => {
    await collection.deleteMany();
  });

  it('project', async () => {
    const inserted = await collection.insertOne({
      exists: 'yes',
    });

    const result = await collection
      .aggregate([
        {
          $match: {
            _id: inserted.insertedId,
          },
        },
        {
          $project: {
            exists: 1,
            what: 1,
          }
        }
      ])
      .toArray();

    console.log(util.inspect(result, false, null, true));
    console.log({
      id: inserted.insertedId,
      hex: inserted.insertedId.toHexString(),
      base64: inserted.insertedId.toString('base64'),
    })
  });
});
