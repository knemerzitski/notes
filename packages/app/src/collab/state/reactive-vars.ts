import { Reference, makeVar } from '@apollo/client';

export const activeCollabTextsVar = makeVar<Record<string, Reference>>({});
