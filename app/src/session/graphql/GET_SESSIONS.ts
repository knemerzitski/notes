import { gql } from '../../__generated__/gql';

const GET_SESSIONS = gql(`
  query SessionQuery {
    
    sessions @client {
      __typename
      ... on LocalSession {
        id
        displayName
      }
      ... on RemoteSession {
        id
        displayName
        email
      }
    }

    activeSessionIndex @client
  }
`);

export default GET_SESSIONS;
