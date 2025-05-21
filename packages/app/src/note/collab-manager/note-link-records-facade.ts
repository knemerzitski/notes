import { ApolloCache } from '@apollo/client';

import { getCollabTextId, parseUserNoteLinkId } from '../utils/id';

import { CollabTextRecordsFacade } from './collab-text-records-facade';

export class NoteLinkRecordsFacade {
  readonly facade: CollabTextRecordsFacade;

  readonly on;
  readonly off;

  constructor(
    userNoteLinkId: string,
    cache: Pick<ApolloCache<unknown>, 'watchFragment' | 'readFragment' | 'identify'>
  ) {
    this.facade = new CollabTextRecordsFacade(
      this.getCollabTextId(userNoteLinkId),
      cache
    );

    this.on = this.facade.on;
    this.off = this.facade.off;
  }

  updateUserNoteLinkId(userNoteLinkId: string) {
    this.facade.updateCollabTextId(this.getCollabTextId(userNoteLinkId));
  }

  private getCollabTextId(userNoteLinkId: string) {
    const { noteId } = parseUserNoteLinkId(userNoteLinkId);

    return getCollabTextId(noteId);
  }
}
