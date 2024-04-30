import { useApolloClient } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { gql } from '../../../__generated__';
import { SubmittedRecordWatcherFragment } from '../../../__generated__/graphql';

const FRAGMENT = gql(`
  fragment SubmittedRecordWatcher on CollabText {
    submittedRecord {
      generatedId
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
`);

type CollabText = SubmittedRecordWatcherFragment;
type SubmittedRecord = CollabText['submittedRecord'];

export interface SubmittedRecordWatcherProps {
  collabTextId: string;
  onNext: (submittedRecord: SubmittedRecord) => void;
}

export default function SubmittedRecordWatcher({
  collabTextId,
  onNext,
}: SubmittedRecordWatcherProps) {
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
          const submittedRecord = value.data.submittedRecord;

          onNextRef.current(submittedRecord);
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [apolloClient, collabTextId]);

  return null;
}
