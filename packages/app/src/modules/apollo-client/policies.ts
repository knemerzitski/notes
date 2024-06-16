import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import authPolicies from '../auth/policies';
import collabTextPolicies from '../collab/policies';
import basePolicies from '../global/policies';
import notePolicies from '../note/policies';
import localNotePolicies from '../note-local/policies';
import preferencesPolicies from '../preferences/policies';

import { LinkTypePolicies } from './links/type-link';
import { EvictTypePolicies } from './policy/evict';
import { PersistTypePolicies } from './policy/persist';
import logFieldRead from './utils/logFieldRead';
import mergeTypePolicies from './utils/mergeTypePolicies';

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

  localNotePolicies,
];

let mergedTypePolicies = mergeTypePolicies(allTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  mergedTypePolicies = logFieldRead(mergedTypePolicies);
}

export const typePolicies = mergedTypePolicies;
