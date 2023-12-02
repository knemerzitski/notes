import { gql } from '../../__generated__/gql';

const SIGN_OUT = gql(`
  mutation SignOut {
    signOut
  }
`);

export default SIGN_OUT;
