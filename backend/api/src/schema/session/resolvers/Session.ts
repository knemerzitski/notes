import type { SessionResolvers } from '../../types.generated';
export const Session: SessionResolvers = {
  id(session) {
    return session.id;
  },
  userId(session) {
    return session.userId;
  },
};
