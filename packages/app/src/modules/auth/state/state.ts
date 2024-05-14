import { makeVar } from '@apollo/client';

import { readSessionContext } from './persistence';
import { ClientSession } from '../../../__generated__/graphql';

const sessionCtx = readSessionContext();

export const sessionsVar = makeVar<ClientSession[]>(
  sessionCtx
    ? Object.entries(sessionCtx.sessions).map(([key, session]) => ({
        ...session,
        key,
      }))
    : []
);

export const currentSessionVar = makeVar<ClientSession | null>(
  sessionCtx?.currentSession ?? null
);
