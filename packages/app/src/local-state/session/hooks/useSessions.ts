import { SavedSession } from '../../__generated__/graphql';
import {
  deleteCurrentSessionIndex,
  deleteSessions,
  saveCurrentSessionIndex,
  saveSessions,
} from '../persistence';
import {
  sessionsVar as defaultSessionsVar,
  currentSessionIndexVar as defaultSessionIndexVar,
} from '../state';

export default function useSessions(
  { var: { sessionsVar, currentSessionIndexVar } } = {
    var: {
      sessionsVar: defaultSessionsVar,
      currentSessionIndexVar: defaultSessionIndexVar,
    },
  },
  persistence = {
    sessions: {
      save: saveSessions,
      delete: deleteSessions,
    },
    index: {
      save: saveCurrentSessionIndex,
      delete: deleteCurrentSessionIndex,
    },
  }
) {
  function updateSession(index: number, newSession: SavedSession) {
    const sessions = [...sessionsVar()];
    sessions[index] = newSession;

    persistence.sessions.save(sessions);

    sessionsVar(sessions);
  }

  function deleteSession(index: number) {
    const sessions = [...sessionsVar()];
    sessions.splice(index, 1);

    if (sessions.length === 0) {
      persistence.sessions.delete();
    } else {
      persistence.sessions.save(sessions);
    }

    sessionsVar(sessions);
  }

  /**
   *
   * @param index -1 to clear current sesssion
   * @returns
   */
  function switchToSession(index: number | null | undefined) {
    const currentIndex = currentSessionIndexVar();
    if (currentIndex === index) return true;

    if (index == null) {
      persistence.index.delete();
      currentSessionIndexVar(null);
    } else {
      const sessions = sessionsVar();
      if (index >= sessions.length) return false;
      persistence.index.save(index);
      currentSessionIndexVar(index);
    }

    return true;
  }

  return {
    operations: {
      updateSession,
      deleteSession,
      switchToSession,
    },
  };
}
