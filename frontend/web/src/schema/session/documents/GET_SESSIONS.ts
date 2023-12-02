import { gql } from '../../__generated__/gql';

const GET_SESSIONS = gql(`
  query SessionQuery {

    clientSessions @client {
      __typename
      ... on LocalSession {
        id
        displayName
      }
      ... on RemoteSession {
        cookieIndex
        displayName
        email
      }
    }

    activeClientSessionIndex @client
  }
`);

export default GET_SESSIONS;
