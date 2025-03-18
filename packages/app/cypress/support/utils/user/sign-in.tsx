import { GraphQLService } from '../../../../src/graphql/types';
import { signInWithGoogle } from './sign-in-with-google';

export async function signIn({
  graphQLService,
  signInUserId,
  displayName,
}: {
  graphQLService: GraphQLService;
  signInUserId: string;
  displayName?: string;
}) {
  return signInWithGoogle({
    graphQLService,
    displayName,
    googleUserId: signInUserId,
  });
}
