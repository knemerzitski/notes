import { useCallback } from 'react';

import { ClientSession } from '../../__generated__/graphql';

import { saveSessionContext, deleteSessionContext } from './persistence';
import {
  sessionsVar as defaultSessionsVar,
  currentSessionVar as defaultSessionVar,
} from './state';

type UpdateClientSession = Omit<ClientSession, 'authProviderEntries'> &
  Partial<Pick<ClientSession, 'authProviderEntries'>>;

export default function useSessionMutations(
  { var: { sessionsVar, currentSessionVar } } = {
    var: {
      sessionsVar: defaultSessionsVar,
      currentSessionVar: defaultSessionVar,
    },
  },
  persistence = {
    sessionContext: {
      save: saveSessionContext,
      delete: deleteSessionContext,
    },
  }
) {
  function sessionsArrayToMap(sessions: ClientSession[]) {
    const result: Record<string, ClientSession> = {};
    for (const session of sessions) {
      result[session.id] = session;
    }
    return result;
  }

  const currentSessionWithIndex = useCallback(() => {
    const currentSession = currentSessionVar();
    if (!currentSession) {
      return null;
    }

    const sessions = sessionsVar();
    const currentSessionIndex = sessions.findIndex(
      (session) => session.id === currentSession.id
    );
    if (currentSessionIndex === -1) {
      return null;
    }

    return {
      session: currentSession,
      index: currentSessionIndex,
    };
  }, [currentSessionVar, sessionsVar]);

  const currentSessionOrDefault = useCallback(
    (fallback: ClientSession) => {
      const currentSession = currentSessionVar();
      if (currentSession) {
        return currentSession;
      }

      const sessions = sessionsVar();
      const firstSession = sessions[0];
      if (firstSession) {
        return firstSession;
      }

      return fallback;
    },
    [currentSessionVar, sessionsVar]
  );

  const updateSession = useCallback(
    (updatedSession: UpdateClientSession) => {
      const sessionsMap = sessionsArrayToMap(sessionsVar());

      const updatedClientSession: ClientSession = {
        ...updatedSession,
        authProviderEntries: updatedSession.authProviderEntries ?? [],
      };

      const existingSession = sessionsMap[updatedSession.id];

      sessionsMap[updatedSession.id] = {
        ...updatedSession,
        authProviderEntries: existingSession
          ? Object.values(
              Object.fromEntries(
                [
                  ...existingSession.authProviderEntries,
                  ...updatedClientSession.authProviderEntries,
                ].map((entry) => [entry.provider, entry])
              )
            )
          : updatedClientSession.authProviderEntries,
      };

      const currentSession = currentSessionOrDefault(updatedClientSession);
      const newCurrentSession =
        updatedClientSession.id === currentSession.id
          ? updatedClientSession
          : currentSession;

      persistence.sessionContext.save({
        currentSession: newCurrentSession,
        sessions: sessionsMap,
      });

      sessionsVar(Object.values(sessionsMap));
      currentSessionVar(newCurrentSession);
    },
    [currentSessionOrDefault, currentSessionVar, sessionsVar, persistence.sessionContext]
  );

  const clearSessions = useCallback(() => {
    persistence.sessionContext.delete();
    sessionsVar([]);
    currentSessionVar(null);
  }, [sessionsVar, currentSessionVar, persistence.sessionContext]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      const newSessions = [...sessionsVar()].filter(
        (session) => session.id !== sessionId
      );
      const currentSession = currentSessionVar();

      const newCurrentSession =
        currentSession && currentSession.id === sessionId
          ? newSessions[0]
          : currentSession;

      if (!newCurrentSession) {
        clearSessions();
      } else {
        persistence.sessionContext.save({
          currentSession: newCurrentSession,
          sessions: sessionsArrayToMap(newSessions),
        });
        sessionsVar(newSessions);
        currentSessionVar(newCurrentSession);
      }
    },
    [clearSessions, persistence.sessionContext, currentSessionVar, sessionsVar]
  );

  /**
   *
   * @param index set null to clear current session
   * @returns New session with index after switchingor null if new session doesn't exist
   */
  const switchToSession = useCallback(
    (sessionId: string | null | undefined) => {
      const currentSession = currentSessionVar();
      if (sessionId == null) {
        // Delete session on null
        if (currentSession) {
          deleteSession(String(currentSession.id));
        }
      } else {
        // Switch to new session
        const currentSession = currentSessionVar();
        if (!currentSession || currentSession.id !== sessionId) {
          const sessions = sessionsVar();
          const newCurrentSession = sessions.find((session) => session.id === sessionId);
          if (newCurrentSession) {
            persistence.sessionContext.save({
              currentSession: newCurrentSession,
              sessions: sessionsArrayToMap(sessionsVar()),
            });
            currentSessionVar(newCurrentSession);
          }
        }
      }

      return currentSessionWithIndex();
    },
    [
      currentSessionVar,
      deleteSession,
      persistence.sessionContext,
      sessionsVar,
      currentSessionWithIndex,
    ]
  );

  const availableSessionKeys = useCallback(() => {
    return sessionsVar().map((session) => String(session.id));
  }, [sessionsVar]);

  const filterSessions = useCallback(
    (filterKeys: string[]) => {
      const newSessions = sessionsVar().filter((session) =>
        filterKeys.includes(String(session.id))
      );

      const newCurrentSession = newSessions[0];

      if (!newCurrentSession) {
        clearSessions();
        return;
      }

      persistence.sessionContext.save({
        currentSession: newCurrentSession,
        sessions: sessionsArrayToMap(newSessions),
      });
      sessionsVar(newSessions);
      currentSessionVar(newCurrentSession);
    },
    [sessionsVar, currentSessionVar, persistence.sessionContext, clearSessions]
  );

  return {
    updateSession,
    deleteSession,
    switchToSession,
    clearSessions,
    availableSessionKeys,
    filterSessions,
  };
}
