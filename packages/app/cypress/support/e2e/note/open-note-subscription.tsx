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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      openNoteSubscription: (
        options: OpenNoteSubscriptionOptions
      ) => Chainable<OpenNoteSubscriptionResult>;
    }
  }
}

interface OpenNoteSubscriptionOptions {
  noteId: string;
  graphQLService: GraphQLService;
}

interface OpenNoteSubscriptionResult {
  unsubscribe: () => void;
  getNext: AsyncEventQueue<Event>['getNext'];
  onNext: AsyncEventQueue<Event>['onNext'];
}

type Event = ListenerEvent<Parameters<typeof OpenNoteSubscription>[0]['listener']>;

Cypress.Commands.add(
  'openNoteSubscription',
  ({ noteId, graphQLService }: OpenNoteSubscriptionOptions) => {
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

    return cy.wrap({
      unsubscribe: unmount,
      getNext: mutationEvents.getNext.bind(mutationEvents),
      onNext: mutationEvents.onNext.bind(mutationEvents),
    });
  }
);
