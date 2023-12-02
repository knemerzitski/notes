import { gql } from '../../__generated__/gql';

const SIGN_IN = gql(`
  mutation SignIn($input: SignInInput!)  {
    signIn(input: $input)
  }
`);

export default SIGN_IN;
