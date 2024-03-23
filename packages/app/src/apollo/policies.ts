import { TypePolicies } from '@apollo/client';

import localNotePolicies from '../local-state/note/policies';
import localPreferencesPolicies from '../local-state/preferences/policies';
import notePolicies from '../note/policies';
import localSessionPolicies from '../session/state/policies';

import logFieldRead from './utils/logFieldRead';
import mergeArrayTypePolicies from './utils/mergeArrayTypePolicies';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const definedArrayTypePolicies: TypePolicies[] = [
  notePolicies,

  localPreferencesPolicies,
  localSessionPolicies,
  localNotePolicies,
];

let typePolicies = mergeArrayTypePolicies(definedArrayTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
