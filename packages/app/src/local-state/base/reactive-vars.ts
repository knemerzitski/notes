import { makeVar } from '@apollo/client';

export const clientSynchronizationVar = makeVar(new Set());
