import { renderHook } from '@testing-library/react';

import { ReactNode } from 'react';

import { GraphQLServiceProvider } from '../../../../src/graphql/components/GraphQLServiceProvider';
import { CurrentUserIdProvider } from '../../../../src/user/components/CurrentUserIdProvider';
import { useSignInWithGoogleMutation } from '../../../../src/user/hooks/useSignInWithGoogleMutation';

import { getCurrentUserId } from '../../../../src/user/models/signed-in-user/get-current';

import { GraphQLService } from '../../../../src/graphql/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      signIn: (options: SignInOptions) => Chainable<SignInResult>;
    }
  }
}

interface SignInOptions {
  graphQLService: GraphQLService;
  googleUserId: string;
  displayName?: string;
}

interface SignInResult {
  userId: string;
}

Cypress.Commands.add(
  'signIn',
  ({ graphQLService, googleUserId, displayName }: SignInOptions) => {
    return cy.then(async () => {
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
      } satisfies SignInResult;
    });
  }
);
