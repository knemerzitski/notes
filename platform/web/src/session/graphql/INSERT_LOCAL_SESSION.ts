import { gql } from '../../__generated__/gql';

const INSERT_LOCAL_SESSION = gql(`
  mutation InsertLocalSession($displayName: String!)  {
    insertLocalSession(displayName: $displayName) @client {
      id
      displayName
    }
  }
`);

export default INSERT_LOCAL_SESSION;
