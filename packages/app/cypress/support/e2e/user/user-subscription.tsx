import { render } from '@testing-library/react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { GraphQLService } from '../../../../src/graphql/types';
import { SignedInUserEventsSubscription } from '../../../../src/user/components/SignedInUserEventsSubscription';
import {
  AsyncEventQueue,
  ListenerEvent,
} from '../../../../../utils/src/async-event-queue';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      userSubscription: (
        options: UserSubscriptionOptions
      ) => Chainable<UserSubscriptionResult>;
    }
  }
}

interface UserSubscriptionOptions {
  graphQLService: GraphQLService;
}

interface UserSubscriptionResult {
  unsubscribe: () => void;
  getNext: AsyncEventQueue<Event>['getNext'];
  onNext: AsyncEventQueue<Event>['onNext'];
}

type Event = ListenerEvent<
  Parameters<typeof SignedInUserEventsSubscription>[0]['listener']
>;

Cypress.Commands.add(
  'userSubscription',
  ({ graphQLService }: UserSubscriptionOptions) => {
    const mutationEvents = new AsyncEventQueue<Event>();

    const { unmount } = render(
      <GraphQLServiceProvider service={graphQLService}>
        <CurrentUserIdProvider>
          <SignedInUserEventsSubscription
            listener={mutationEvents.next.bind(mutationEvents)}
          />
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
