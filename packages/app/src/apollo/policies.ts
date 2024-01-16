import { TypePolicies } from '@apollo/client';

import localNoteTypePolicies from '../local-state/note/policies';
import localPreferencesTypePolicies from '../local-state/preferences/policies';
import localSessionTypePolicies from '../local-state/session/policies';

import logFieldRead from './utils/logFieldRead';
import mergeArrayTypePolicies from './utils/mergeArrayTypePolicies';

const LOG_READ = false;

/**
 * Define all type policies here
 */
const definedArrayTypePolicies: TypePolicies[] = [
  localPreferencesTypePolicies,
  localSessionTypePolicies,
  localNoteTypePolicies,
];

let typePolicies = mergeArrayTypePolicies(definedArrayTypePolicies);
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (LOG_READ) {
  typePolicies = logFieldRead(typePolicies);
}

export default typePolicies;
