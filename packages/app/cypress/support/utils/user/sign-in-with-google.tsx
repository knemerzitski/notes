import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { GraphQLService } from '../../../../src/graphql/types';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';
import { useSignInWithGoogleMutation } from '../../../../src/user/hooks/useSignInWithGoogleMutation';
import { getCurrentUserId } from '../../../../src/user/models/signed-in-user/get-current';

export async function signInWithGoogle({
  graphQLService,
  googleUserId,
  displayName,
}: {
  graphQLService: GraphQLService;
  googleUserId: string;
  displayName?: string;
}) {
  const {
    result: { current: signInWithGoogleMutation },
  } = renderHook(() => useSignInWithGoogleMutation(), {
    wrapper: ({ children }: { children: ReactNode }) => {
      return (
        <GraphQLServiceProvider service={graphQLService}>
          <CurrentUserIdProvider>{children}</CurrentUserIdProvider>
        </GraphQLServiceProvider>
      );
    },
  });

  await signInWithGoogleMutation({
    credential: JSON.stringify({
      id: googleUserId,
      name: displayName ?? `${googleUserId} User`,
      email: `${googleUserId}@test`,
    }),
  });

  return {
    userId: getCurrentUserId(graphQLService.client.cache),
  };
}
