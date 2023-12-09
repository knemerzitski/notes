import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { UserDocument } from '../../../schema/user/mongoose';
import { model } from '../../helpers/mongoose';

describe('User', () => {
  const { User } = model;

  describe('indexes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let indexes: any[];

    beforeAll(async () => {
      await User.syncIndexes();
      indexes = await User.listIndexes();
    });

    it('thirdParty.google.id is unique and sparse', () => {
      expect(indexes).containSubset([
        {
          key: { 'thirdParty.google.id': 1 },
          unique: true,
          sparse: true,
        },
      ]);
    });
  });

  it('saves new user with only displayName', async () => {
    const newUser = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });

    await newUser.save();

    const fetchedNewUser = await User.findById(newUser._id);

    expect(fetchedNewUser?.toObject()).toEqual(newUser.toObject());
  });

  it('inserts two different users', async () => {
    const newUser = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
    await newUser.save();

    const newUser2 = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
    await newUser2.save();

    const fetchedUsers = await User.find();

    expect(fetchedUsers.map((u) => u.toObject())).toEqual(
      [newUser, newUser2].map((u) => u.toObject())
    );
  });

  it('requires displayName', async () => {
    const newUser = new User();

    await expect(async () => {
      await newUser.save();
    }).rejects.toThrowError();
  });

  describe('save', () => {
    let newUser: UserDocument;

    beforeEach(async () => {
      newUser = new User({
        profile: {
          displayName: faker.person.firstName(),
        },
      });
      await newUser.save();
    });

    it('generates offline.id', () => {
      expect(newUser.offline.id).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(newUser.offline.id.length).toBeGreaterThan(15);
    });
  });
});
