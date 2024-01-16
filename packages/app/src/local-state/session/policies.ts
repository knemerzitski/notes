import { TypePolicies } from '@apollo/client';

import { SavedSession } from '../../__generated__/graphql';

import { currentSessionIndexVar, sessionsVar } from './state';

const sessionPolicies: TypePolicies = {
  Query: {
    fields: {
      savedSessions(): SavedSession[] {
        return sessionsVar();
      },
      currentSavedSessionIndex(): number | null {
        return currentSessionIndexVar();
      },
      currentSavedSession(): SavedSession | null {
        const sessions = sessionsVar();
        const index = currentSessionIndexVar();
        if (index !== null && 0 <= index && index < sessions.length) {
          return sessions[index];
        }
        return null;
      },
      isLoggedIn(): boolean {
        return currentSessionIndexVar() != null;
      },
    },
  },
};

export default sessionPolicies;
