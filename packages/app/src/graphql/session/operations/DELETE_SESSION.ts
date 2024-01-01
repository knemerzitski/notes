import { gql } from '../../__generated__/gql';

const DELETE_SESSION = gql(`
  mutation DeleteClientSession($input: DeleteSavedSessionInput!)  {
    deleteSavedSession(input: $input) @client {
      deleted
    }
  }
`);

export default DELETE_SESSION;
