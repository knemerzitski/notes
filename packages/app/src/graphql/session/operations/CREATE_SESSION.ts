import { gql } from '../../__generated__/gql';

const CREATE_SESSION = gql(`
  mutation CreateSavedSession($input: CreateSavedSessionInput!)  {
    createSavedSession(input: $input)  @client {
      savedSession {
        index
        profile {
          displayName
          email
        }
      }
    }
  }
`);

export default CREATE_SESSION;
