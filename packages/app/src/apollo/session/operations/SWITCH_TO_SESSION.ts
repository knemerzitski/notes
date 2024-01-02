import { gql } from '../../__generated__/gql';

const SWITCH_TO_SESSION = gql(`
  mutation SwitchToSavedSession($input: SwitchToSavedSessionInput!)  {
    switchToSavedSession(input: $input) @client {
      session {
        index
      }
    }
  }
`);

export default SWITCH_TO_SESSION;
