import { TypePolicies } from '@apollo/client';

import localNotePolicies from '../local-state/note/policies';
import localPreferencesPolicies from '../local-state/preferences/policies';
import notePolicies from '../note/state/policies';
import localSessionPolicies from '../session/state/policies';

import logFieldRead from './utils/logFieldRead';
import mergeTypePolicies from './utils/mergeTypePolicies';
import { collabTextPolicies } from '../collab/state/policies';
import localBasePolicies from '../local-state/base/policies';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const allTypePolicies: TypePolicies[] = [
  notePolicies,
  collabTextPolicies,

  localBasePolicies,
  localPreferencesPolicies,
  localSessionPolicies,
  localNotePolicies,
];

let typePolicies = mergeTypePolicies(allTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
