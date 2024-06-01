import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import logFieldRead from './utils/logFieldRead';
import mergeTypePolicies from './utils/mergeTypePolicies';
import collabTextPolicies from '../collab/policies';
import preferencesPolicies from '../preferences/policies';
import authPolicies from '../auth/policies';
import basePolicies from '../global/policies';
import notePolicies from '../note/policies';
import noteLocalPolicies from '../note-local/policies';
import { EvictTypePolicies } from './policy/evict';
import { PersistTypePolicies } from './policy/persist';
import { LinkTypePolicies } from './links/type-link';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const allTypePolicies: (TypePolicies &
  PersistTypePolicies &
  EvictTypePolicies<NormalizedCacheObject> &
  LinkTypePolicies<NormalizedCacheObject>)[] = [
  basePolicies,
  preferencesPolicies,

  authPolicies,

  notePolicies,
  collabTextPolicies,

  noteLocalPolicies,
];

let mergedTypePolicies = mergeTypePolicies(allTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  mergedTypePolicies = logFieldRead(mergedTypePolicies);
}

export const typePolicies = mergedTypePolicies;
