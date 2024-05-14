import { TypePolicies } from '@apollo/client';

import logFieldRead from './utils/logFieldRead';
import mergeTypePolicies from './utils/mergeTypePolicies';
import { collabTextPolicies } from '../collab/policies';
import preferencesPolicies from '../preferences/policies';
import sessionPolicies from '../auth/state/policies';
import basePolicies from '../global/policies';
import notePolicies from '../note/policies';
import noteLocalPolicies from '../note-local/policies';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const allTypePolicies: TypePolicies[] = [
  notePolicies,
  collabTextPolicies,

  basePolicies,
  preferencesPolicies,
  sessionPolicies,
  noteLocalPolicies,
];

let typePolicies = mergeTypePolicies(allTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
