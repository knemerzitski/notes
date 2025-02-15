/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { faker } from '@faker-js/faker';
import { ReadonlyDeep } from '~utils/types';

import { DBNoteSchema } from '../../../../mongodb/schema/note';
import { DBUserSchema } from '../../../../mongodb/schema/user';

import { fakeNotePopulateQueue } from './note';

import { TestNoteCategory, userAddNote } from './populate';
import { fakeUserPopulateQueue } from './user';

export function generateTrashedNotes(
  config: ReadonlyDeep<{
    trashCategory: string;
    nUsers: number;
    nNotes: number;
    /**
     * Chance that note is trashed
     */
    trashedChance: number;
    /**
     * Chance that a trashed note is expired
     */
    expiredChance: number;
    /**
     * Chance that note shared with other user has been made owner of note
     */
    otherUserOwnerChance: number;
    /**
     * How many times a note is shared
     * share chance: number of other users
     */
    sharedChanceTable: Record<number, number>;
  }>
) {
  const notes: DBNoteSchema[] = [];
  const users: DBUserSchema[] = [];

  function createNote(user: DBUserSchema) {
    const { note } = fakeNotePopulateQueue(user);
    notes.push(note);
    return note;
  }

  function addNoteToUser(user: DBUserSchema, note: DBNoteSchema, ownerChance = 1) {
    const isTrashed = faker.number.float() <= config.trashedChance;
    const isExpired = isTrashed && faker.number.float() <= config.expiredChance;
    userAddNote(user, note, {
      override: {
        isOwner: ownerChance === 1 ? true : faker.number.float() <= ownerChance,
        ...(isTrashed && {
          trashed: {
            expireAt: isExpired ? faker.date.past() : faker.date.future(),
          },
        }),
        categoryName: isTrashed ? config.trashCategory : TestNoteCategory.MAIN,
      },
    });
  }

  for (let i = 0; i < config.nUsers; i++) {
    const user = fakeUserPopulateQueue();
    users.push(user);
    if (i < config.nNotes) {
      const note = createNote(user);
      addNoteToUser(user, note);
    }
  }

  // Create remaining notes and assign it to a random user
  const n = config.nNotes - notes.length;
  for (let i = 0; i < n; i++) {
    const randomUserIndex = faker.number.int({
      min: 0,
      max: users.length - 1,
    });
    const user = users[randomUserIndex]!;
    const note = createNote(user);
    addNoteToUser(user, note);
  }

  function getNoteSharedUsersCount() {
    const randValue = faker.number.float();
    for (const [chance, count] of Object.entries(config.sharedChanceTable)) {
      const chanceNr = Number.parseFloat(chance);
      if (randValue <= chanceNr) {
        return count;
      }
    }

    return 0;
  }

  /**
   * Share note with other users `sharedChanceTable`
   */
  for (const note of notes) {
    const sharedCount = getNoteSharedUsersCount();
    const randomUserIndex = faker.number.int({
      min: 0,
      max: users.length - 1,
    });
    for (let i = 0; i <= sharedCount; i++) {
      const user = users[(randomUserIndex + i) % users.length]!;
      addNoteToUser(user, note, config.otherUserOwnerChance);
    }
  }

  return {
    users,
    notes,
  };
}
