import { Reference, makeVar } from '@apollo/client';

export const activeNotesVar = makeVar<Record<string, Reference>>({});
