import { gql } from '../../__generated__/gql';

const CREATE_REMOTE_SESSION = gql(`
  mutation CreateRemoteSession($input: RemoteSessionInput!)  {
    createRemoteSession(input: $input) @client
  }
`);

export default CREATE_REMOTE_SESSION;
