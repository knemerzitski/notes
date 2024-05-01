import { WatchFragmentResult, useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { UnprocessedRecordsWatcherFragment } from '../../../__generated__/graphql';

const FRAGMENT = gql(`
  fragment UnprocessedRecordsWatcher on CollabText {
    unprocessedRecords {
      type
      record {
        change {
          revision
          changeset
        }
        beforeSelection {
          start
          end
        }
        afterSelection {
          start
          end
        }
      }
    }
  }
`);

export interface UnprocessedRecordsWatcherProps {
  collabTextId: string;
  onNext: (value: WatchFragmentResult<UnprocessedRecordsWatcherFragment>) => void;
}

export default function UnprocessedRecordsWatcher({
  collabTextId,
  onNext,
}: UnprocessedRecordsWatcherProps) {
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
