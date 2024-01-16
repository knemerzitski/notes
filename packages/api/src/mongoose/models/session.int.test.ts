import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import { Session, User } from '../../tests/helpers/mongoose';

import { UserDocument } from './user';

describe('Session', () => {
  let user: UserDocument;

  beforeEach(async () => {
    user = new User({
      profile: {
        displayName: faker.person.firstName(),
      },
    });
    await user.save();
  });

  describe('indexes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexes = await Session.listIndexes();

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

  it('is inserted', async () => {
    const newSession = new Session({
      userId: user._id,
      expireAt: faker.date.future(),
    });
    await newSession.save();

    const fetchedSession = await Session.findById(newSession._id);
    expect(fetchedSession?.toObject()).toEqual(newSession.toObject());
  });

  it('generates cookieString', async () => {
    const newSession = new Session({
      userId: user._id,
      expireAt: faker.date.future(),
    });
    await newSession.save();

    expect(newSession.cookieId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newSession.cookieId.length).toBeGreaterThan(15);
  });

  it('findByCookieId', async () => {
    const newSession = new Session({
      userId: user._id,
      expireAt: faker.date.future(),
    });
    await newSession.save();

    const { userId, ...newSessionNoUserId } = newSession.toObject();

    const fetchedCustomSession = await Session.findByCookieId(newSession.cookieId);

    // Notes are not returned
    const { notes, ...userNoNotes } = user.toObject();

    expect(fetchedCustomSession).toStrictEqual({
      ...newSessionNoUserId,
      user: userNoNotes,
    });
  });
});
