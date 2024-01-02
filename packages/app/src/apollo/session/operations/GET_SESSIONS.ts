import { gql } from '../../__generated__/gql';

const GET_SESSIONS = gql(`
  query SavedSessions {
    savedSessions @client {
      index
      profile {
        displayName
        email
      }
    }

    currentSavedSession @client {
      index
      profile {
        displayName
        email
      }
    }
  }
`);

export default GET_SESSIONS;
