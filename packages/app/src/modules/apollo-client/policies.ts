import { NormalizedCacheObject, TypePolicies } from '@apollo/client';

import { sessionPolicies } from '../auth/policies';
import { collabTextPolicies } from '../collab/policies';
import { basePolicies } from '../global/policies';
import { localNotePolicies } from '../note/local/policies';
import { notePolicies } from '../note/remote/policies';
import { preferencesPolicies } from '../preferences/policies';

import { LinkTypePolicies } from './links/type-link';
import { EvictTypePolicies } from './policy/evict';
import { PersistTypePolicies } from './policy/persist';
import { logFieldRead } from './utils/log-field-read';
import { mergeTypePolicies } from './utils/merge-type-policies';

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

  sessionPolicies,

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
