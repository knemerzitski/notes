import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { LocalChangesWatcherFragment } from '../../../__generated__/graphql';

const FRAGMENT = gql(`
  fragment LocalChangesWatcher on CollabText {
    localChanges
  }
`);

type CollabText = LocalChangesWatcherFragment;
type LocalChanges = CollabText['localChanges'];

export interface LocalChangesWatcherProps {
  collabTextId: string;
  onNext: (localChanges: LocalChanges) => void;
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
          if (!value.complete) return;
          const localChanges = value.data.localChanges;

          onNextRef.current(localChanges);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  return null;
}
