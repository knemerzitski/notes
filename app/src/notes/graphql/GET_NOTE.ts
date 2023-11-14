import { gql } from '../../__generated__/gql';

const GET_NOTE = gql(`
  query Note($id: String!) {
    note(id: $id) @local {
      id
      title
      content
    }
  }
`);

export default GET_NOTE;
