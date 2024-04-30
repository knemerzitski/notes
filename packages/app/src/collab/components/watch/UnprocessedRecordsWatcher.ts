import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { UnprocessedRecordsWatcherFragment } from '../../../__generated__/graphql';

const FRAGMENT = gql(`
  fragment UnprocessedRecordsWatcher on CollabText {
    unprocessedRecords {
      done
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

type CollabText = UnprocessedRecordsWatcherFragment;
type UnprocessedRecords = CollabText['unprocessedRecords'];

export interface UnprocessedRecordsWatcherProps {
  collabTextId: string;
  onNext: (unprocessedRecords: UnprocessedRecords) => void;
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
          if (!value.complete) return;
          const unprocessedRecords = value.data.unprocessedRecords.filter(
            (record) => !record.done
          );

          onNextRef.current(unprocessedRecords);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  return null;
}
