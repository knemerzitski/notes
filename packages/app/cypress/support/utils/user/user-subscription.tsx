import { render } from '@testing-library/react';

import {
  AsyncEventQueue,
  ListenerEvent,
} from '../../../../../utils/src/async-event-queue';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { GraphQLService } from '../../../../src/graphql/types';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';

import { SignedInUserEventsSubscription } from '../../../../src/user/components/SignedInUserEventsSubscription';

type Event = ListenerEvent<
  Parameters<typeof SignedInUserEventsSubscription>[0]['listener']
>;

export function userSubscription({ graphQLService }: { graphQLService: GraphQLService }) {
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

  return {
    unsubscribe: unmount,
    getNext: mutationEvents.getNext.bind(mutationEvents),
    onNext: mutationEvents.onNext.bind(mutationEvents),
  };
}
