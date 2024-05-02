import { useFragment } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import LocalChangesToSubmittedRecordDebounced from './LocalChangesToSubmittedRecordDebounced';
import UnprocessedRecordsHandler from './UnprocessedRecordsHandler';
import LocalChangesClientSychronized from './LocalChangesClientSychronized';

const FRAGMENT = gql(`
  fragment ActiveCollabTextsManager on AllCollabTexts {
    active {
      id
    }
  }
`);

export default function ActiveCollabTextsManager() {
  const allCollabTexts = useFragment({
    from: {
      __typename: 'AllCollabTexts',
    },
    fragment: FRAGMENT,
  });

  if (!allCollabTexts.complete) return null;

  return allCollabTexts.data.active.map((activeCollabText) => {
    const id = String(activeCollabText.id);
    return (
      <>
        <LocalChangesToSubmittedRecordDebounced
          key={id}
          collabTextId={id}
          wait={500}
          options={{
            maxWait: 1000,
          }}
        />
        <UnprocessedRecordsHandler key={id} collabTextId={id} />
        <LocalChangesClientSychronized key={id} collabTextId={id} />
      </>
    );
  });
}
