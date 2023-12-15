import { assert } from 'vitest';

import UserDocumentHelper from './UserDocumentHelper';

export default class UserModelHelper {
  users: UserDocumentHelper[] = [];

  getUser(index: number) {
    const user = this.users[index];
    assert(user !== undefined);
    return user;
  }

  getOrCreateUser(index: number) {
    if (index >= this.users.length) {
      this.createUsers(1 + index - this.users.length);
    }
    return this.getUser(index);
  }

  createUsers(count: number) {
    this.users.push(...[...new Array(count).keys()].map(() => new UserDocumentHelper()));
  }

  getUserWithLeastNotes() {
    if (this.users.length === 0) return null;

    return this.users.reduce((smallestUser, newUser) =>
      newUser.noteData.length < smallestUser.noteData.length ? newUser : smallestUser
    );
  }

  /**
   * Creates {@link count} notes for user with least amount of notes
   * @param count Amount of notes created
   */
  async createNotesForUserWithLeastNotes(count: number) {
    const leastNotesUser = this.getUserWithLeastNotes();
    if (leastNotesUser) {
      await leastNotesUser.createNotes(count);
    }
  }

  /**
   * Creates notes by random size always selecting user with least amount of notes first.
   * Notes are created until {@link totalCount} is fulfilled.
   * @param totalCount Total amount of notes inserted to database
   * @param nextCount Next insert count
   */
  async createNotesRandomly(totalCount: number, nextCount: () => number) {
    let remainingCount = totalCount;
    while (remainingCount > 0) {
      const count = nextCount();
      assert(count > 0);
      await this.createNotesForUserWithLeastNotes(count);
      remainingCount -= count;
    }
  }
}
