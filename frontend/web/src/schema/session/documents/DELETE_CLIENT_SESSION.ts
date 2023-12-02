import { gql } from '../../__generated__/gql';

const DELETE_CLIENT_SESSION = gql(`
  mutation DeleteClientSession($index: Int!)  {
    deleteClientSession(index: $index) @client
  }
`);

export default DELETE_CLIENT_SESSION;
