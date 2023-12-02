import { gql } from '../../__generated__/gql';

const GET_NOTES = gql(`
  query Notes {
    notes @session {
      id
      title
      content
    }
  }
`);

export default GET_NOTES;
