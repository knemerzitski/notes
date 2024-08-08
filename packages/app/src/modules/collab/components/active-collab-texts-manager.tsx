import { useQuery } from '@apollo/client';
import { Fragment } from 'react';

import { gql } from '../../../__generated__/gql';

import { LocalChangesClientSychronized } from './local-changes-client-synchronized';
import { LocalChangesToSubmittedRecordDebounced } from './local-changes-to-submitted-record-debounced';
import { PersistChangesDebounced } from './persist-changes-debounced';

const QUERY = gql(`
  query ActiveCollabTextsManager {
    allActiveCollabTexts @client {
      id
    }
  }
`);

export function ActiveCollabTextsManager() {
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
        <PersistChangesDebounced
          collabTextId={id}
          wait={800}
          options={{
            maxWait: 6000,
          }}
        />
        <LocalChangesClientSychronized collabTextId={id} />
      </Fragment>
    );
  });
}
