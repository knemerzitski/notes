import { gql } from '../../__generated__/gql';

const SWITCH_TO_CLIENT_SESSION = gql(`
  mutation SwitchToClientSession($index: Int!)  {
    switchToClientSession(index: $index) @client
  }
`);

export default SWITCH_TO_CLIENT_SESSION;
