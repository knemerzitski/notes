import { makeVar } from '@apollo/client';

import { SavedSession } from '../../__generated__/graphql';

import { readSessionContext } from './persistence';

const sessionCtx = readSessionContext();

export const sessionsVar = makeVar<SavedSession[]>(
  sessionCtx
    ? Object.entries(sessionCtx.sessions).map(([key, session]) => ({
        ...session,
        key,
      }))
    : []
);

export const currentSessionVar = makeVar<SavedSession | null>(
  sessionCtx?.currentSession ?? null
);
