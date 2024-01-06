import { makeVar } from '@apollo/client';

import { SavedSession } from '../__generated__/graphql';

import { readCurrentSessionIndex, readSessions } from './persistence';

export const sessionsVar = makeVar<SavedSession[]>(readSessions());

export const currentSessionIndexVar = makeVar<number | null>(readCurrentSessionIndex());
