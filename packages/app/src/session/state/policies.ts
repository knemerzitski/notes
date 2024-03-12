import { TypePolicies } from '@apollo/client';

import { SavedSession } from '../../__generated__/graphql';

import { currentSessionVar, sessionsVar } from './state';

const sessionPolicies: TypePolicies = {
  Query: {
    fields: {
      savedSessions(): SavedSession[] {
        return sessionsVar();
      },
      currentSavedSessionIndex(): number | null {
        const sessions = sessionsVar();
        const currentSession = currentSessionVar();
        if (!currentSession) return null;

        const index = sessions.findIndex((session) => session.key === currentSession.key);
        if (index < 0) return null;

        return index;
      },
      currentSavedSession(): SavedSession | null {
        return currentSessionVar();
      },
      isSignedIn(): boolean {
        return currentSessionVar() != null;
      },
    },
  },
};

export default sessionPolicies;
