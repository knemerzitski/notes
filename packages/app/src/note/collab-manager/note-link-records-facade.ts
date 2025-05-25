import { ApolloCache } from '@apollo/client';

import { gql } from '../../__generated__';
import { getCollabTextId, parseUserNoteLinkId } from '../utils/id';

import { CollabTextRecordsFacade } from './collab-text-records-facade';

const NoteLinkRecordsFacade_UserNoteLinkFragment = gql(`
  fragment NoteLinkRecordsFacade_UserNoteLinkFragment on UserNoteLink {
    id
    historyTailRevision
  }
`);

export class NoteLinkRecordsFacade {
  readonly facade: CollabTextRecordsFacade;

  readonly on;
  readonly off;

  private readonly unsubscribe: () => void;

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

    const observable = cache.watchFragment({
      fragment: NoteLinkRecordsFacade_UserNoteLinkFragment,
      from: {
        __typename: 'UserNoteLink',
        id: userNoteLinkId,
      },
      optimistic: false,
    });

    const subscription = observable.subscribe((value) => {
      if (!value.complete) {
        return;
      }

      this.facade.setTailRevision(value.data.historyTailRevision);
    });

    this.unsubscribe = () => {
      subscription.unsubscribe();
    };
  }

  dispose() {
    this.facade.dispose();
    this.unsubscribe();
  }

  updateUserNoteLinkId(userNoteLinkId: string) {
    this.facade.updateCollabTextId(this.getCollabTextId(userNoteLinkId));
  }

  private getCollabTextId(userNoteLinkId: string) {
    const { noteId } = parseUserNoteLinkId(userNoteLinkId);

    return getCollabTextId(noteId);
  }
}
