import { Reference, makeVar } from '@apollo/client';

/**
 * Active notes mapped by ID
 */
export const activeNotesVar = makeVar<Record<string, Reference>>({});
