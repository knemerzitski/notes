import { gql } from '../../__generated__/gql';

const SIGN_OUT = gql(`
  mutation SignOut {
    signOut {
      signedOut
      activeSessionIndex
    }
  }
`);

export default SIGN_OUT;
