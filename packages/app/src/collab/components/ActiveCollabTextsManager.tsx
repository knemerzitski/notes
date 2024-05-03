import { useQuery } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import LocalChangesToSubmittedRecordDebounced from './LocalChangesToSubmittedRecordDebounced';
import UnprocessedRecordsHandler from './UnprocessedRecordsHandler';
import LocalChangesClientSychronized from './LocalChangesClientSychronized';
import { Fragment } from 'react/jsx-runtime';

const QUERY = gql(`
  query ActiveCollabTextsManager {
    allActiveCollabTexts {
      id
    }
  }
`);

export default function ActiveCollabTextsManager() {
  const { data } = useQuery(QUERY, {
    fetchPolicy: 'cache-only',
  });

  if (!data) return null;

  const activeCollabTexts = data.allActiveCollabTexts;

  return activeCollabTexts.map((activeCollabText) => {
    const id = String(activeCollabText.id);
    return (
      <Fragment key={id}>
        <LocalChangesToSubmittedRecordDebounced
          collabTextId={id}
          wait={500}
          options={{
            maxWait: 1000,
          }}
        />
        <UnprocessedRecordsHandler collabTextId={id} />
        <LocalChangesClientSychronized collabTextId={id} />
      </Fragment>
    );
  });
}
