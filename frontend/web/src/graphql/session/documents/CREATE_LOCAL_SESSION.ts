import { gql } from '../../__generated__/gql';

const CREATE_LOCAL_SESSION = gql(`
  mutation CreateLocalSession($displayName: String!)  {
    createLocalSession(displayName: $displayName) @client
  }
`);

export default CREATE_LOCAL_SESSION;
