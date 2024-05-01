import { WatchFragmentResult, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { LocalChangesWatcherFragment } from '../../../__generated__/graphql';

const FRAGMENT = gql(`
  fragment LocalChangesWatcher on CollabText {
    localChanges
  }
`);

export interface LocalChangesWatcherProps {
  collabTextId: string;
  onNext: (localChanges: WatchFragmentResult<LocalChangesWatcherFragment>) => void;
}

export default function LocalChangesWatcher({
  collabTextId,
  onNext,
}: LocalChangesWatcherProps) {
  const apolloClient = useApolloClient();

  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  useEffect(() => {
    const subscription = apolloClient
      .watchFragment({
        from: {
          id: collabTextId,
          __typename: 'CollabText',
        },
        fragment: FRAGMENT,
      })
      .subscribe({
        next(value) {
          onNextRef.current(value);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  return null;
}
