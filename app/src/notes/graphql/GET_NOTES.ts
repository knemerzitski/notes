import { gql } from '../../__generated__/gql';

const GET_NOTES = gql(`
  query Notes {
    notes @local {
      id
      title
      content
    }
  }
`);

export default GET_NOTES;
