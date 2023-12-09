import { faker } from '@faker-js/faker';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { SessionDocument } from '../../../schema/session/mongoose';
import { UserDocument } from '../../../schema/user/mongoose';
import { model } from '../../helpers/mongoose';

describe('Session', () => {
  const { User, Session } = model;

  let user: UserDocument;

  beforeAll(async () => {
    user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
    await user.save();
  });

  describe('indexes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let indexes: any[];

    beforeAll(async () => {
      await Session.syncIndexes();
      indexes = await Session.listIndexes();
    });

    it('cookieId is unique', () => {
      expect(indexes).containSubset([
        {
          key: { cookieId: 1 },
          unique: true,
        },
      ]);
    });

    it('expireAt has expireAfterSeconds', () => {
      expect(indexes).containSubset([
        {
          key: { expireAt: 1 },
          expireAfterSeconds: 0,
        },
      ]);
    });
  });

  it('throws error on empty session', async () => {
    const newSession = new Session();

    await expect(async () => {
      await newSession.save();
    }).rejects.toThrowError();
  });

  it('userId is required', async () => {
    const newSession = new Session({
      expireAt: faker.date.soon(),
    });

    await expect(async () => {
      await newSession.save();
    }).rejects.toThrowError();
  });

  it('expireAt is required', async () => {
    const newSession = new Session({
      userId: user._id,
    });

    await expect(async () => {
      await newSession.save();
    }).rejects.toThrowError();
  });

  describe('save', () => {
    let newSession: SessionDocument;

    beforeEach(async () => {
      newSession = new Session({
        userId: user._id,
        expireAt: faker.date.future(),
      });
      await newSession.save();
    });

    it('is inserted', async () => {
      const fetchedSession = await Session.findById(newSession._id);
      expect(fetchedSession?.toObject()).toEqual(newSession.toObject());
    });

    it('generates cookieString', () => {
      expect(newSession.cookieId).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(newSession.cookieId.length).toBeGreaterThan(15);
    });
  });
});
