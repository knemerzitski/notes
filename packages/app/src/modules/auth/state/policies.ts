import { TypePolicies } from '@apollo/client';

import { currentSessionVar, sessionsVar } from './state';
import { ClientSession } from '../../../__generated__/graphql';

const sessionPolicies: TypePolicies = {
  Query: {
    fields: {
      clientSessions(): ClientSession[] {
        return sessionsVar();
      },
      currentClientSessionIndex(): number | null {
        const sessions = sessionsVar();
        const currentSession = currentSessionVar();
        if (!currentSession) return null;

        const index = sessions.findIndex((session) => session.id === currentSession.id);
        if (index < 0) return null;

        return index;
      },
      currentClientSession(): ClientSession | null {
        return currentSessionVar();
      },
      isSignedIn(): boolean {
        return currentSessionVar() != null;
      },
    },
  },
};

export default sessionPolicies;
