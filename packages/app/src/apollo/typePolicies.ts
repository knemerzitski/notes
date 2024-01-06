import { TypePolicies } from '@apollo/client';

import noteTypePolicies from '../local-state/note/typePolicies';
import preferencesTypePolicies from '../local-state/preferences/typePolicies';
import sessionTypePolicies from '../local-state/session/typePolicies';

import logFieldRead from './utils/logFieldRead';
import mergeArrayTypePolicies from './utils/mergeArrayTypePolicies';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const definedArrayTypePolicies: TypePolicies[] = [
  preferencesTypePolicies,
  sessionTypePolicies,
  noteTypePolicies,
];

let typePolicies = mergeArrayTypePolicies(definedArrayTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
