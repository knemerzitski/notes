import { render } from '@testing-library/react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { GraphQLService } from '../../../../src/graphql/types';
import { NoteIdProvider } from '../../../../src/note/context/note-id';
import { OpenNoteSubscription } from '../../../../src/note/components/OpenNoteSubscription';
import {
  AsyncEventQueue,
  ListenerEvent,
} from '../../../../../utils/src/async-event-queue';

type Event = ListenerEvent<Parameters<typeof OpenNoteSubscription>[0]['listener']>;

export function openNoteSubscription({
  noteId,
  graphQLService,
}: {
  noteId: string;
  graphQLService: GraphQLService;
}) {
  const mutationEvents = new AsyncEventQueue<Event>();

  const { unmount } = render(
    <GraphQLServiceProvider service={graphQLService}>
      <CurrentUserIdProvider>
        <NoteIdProvider noteId={noteId}>
          <OpenNoteSubscription listener={mutationEvents.next.bind(mutationEvents)} />
        </NoteIdProvider>
      </CurrentUserIdProvider>
    </GraphQLServiceProvider>
  );

  return {
    unsubscribe: unmount,
    getNext: mutationEvents.getNext.bind(mutationEvents),
    onNext: mutationEvents.onNext.bind(mutationEvents),
  };
}
