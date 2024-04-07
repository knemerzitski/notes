import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import { connection } from '../../tests/helpers/mongoose';

import { UserDocument, userSchema } from './user';

// TODO flatten root desctibe

describe.skip('User', () => {
  const User = connection.model('User', userSchema);

  beforeEach(async () => {
    await User.deleteMany();
  });

  describe('indexes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexes = await User.listIndexes();

    it('publicId unique', () => {
      expect(indexes).containSubset([
        {
          key: { publicId: 1 },
          unique: true,
        },
      ]);
    });

    it('thirdParty.google.id unique sparse', () => {
      expect(indexes).containSubset([
        {
          key: { 'thirdParty.google.id': 1 },
          unique: true,
          sparse: true,
        },
      ]);
    });

    it('notes.category.default.order', () => {
      expect(indexes).containSubset([
        {
          key: { 'notes.category.default.order': 1 },
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

    it('generates publicId', () => {
      expect(newUser.publicId).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(newUser.publicId.length).toBeGreaterThan(15);
    });
  });
});
