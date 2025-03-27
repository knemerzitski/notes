import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { fallbackValue } from '../utils/per-page-count';

const UseDefaultPerPageCount_Query = gql(`
  query UseDefaultPerPageCount_Query {
    devicePreferences {
      defaultPerPageCount
    }
  }
`);

export function useDefaultPerPageCount() {
  const { data } = useQuery(UseDefaultPerPageCount_Query, {
    fetchPolicy: 'cache-only',
  });

  return data?.devicePreferences.defaultPerPageCount ?? fallbackValue;
}
