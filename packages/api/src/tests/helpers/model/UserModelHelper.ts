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

  saveUsers() {
    return Promise.all(this.users.map((user) => user.user.save()));
  }

  /**
   * Creates notes by random size always selecting user with least amount of notes first.
   * Notes are created until {@link totalCount} is fulfilled.
   * @param countMap Total amount of notes to insert for user at index
   * @param nextCount Next insert count
   */
  async createNotesRandomly(countMap: Record<number, number>, nextCount: () => number) {
    if (this.users.length === 0) return;

    let leastNotesUser: UserDocumentHelper | null = null;
    do {
      leastNotesUser = null;
      let leastNotesUserMaxCount = 0;

      for (let i = 0; i < this.users.length; i++) {
        const user = this.users[i];
        assert(user !== undefined);
        const maxCount = countMap[i];
        assert(maxCount !== undefined);

        const notesLeftToCreate = maxCount - user.noteData.length;
        if (notesLeftToCreate > 0) {
          if (!leastNotesUser || user.noteData.length < leastNotesUser.noteData.length) {
            leastNotesUser = user;
            leastNotesUserMaxCount = maxCount;
          }
        }
      }

      if (leastNotesUser) {
        const count = Math.min(
          nextCount(),
          leastNotesUserMaxCount - leastNotesUser.noteData.length
        );
        assert(count > 0);
        await leastNotesUser.createNotes(count);
      }
    } while (leastNotesUser != null);
  }
}
