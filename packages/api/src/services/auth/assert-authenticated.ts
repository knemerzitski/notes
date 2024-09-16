import { AuthenticationContext, AuthenticatedContext } from './authentication-context';
import { UnauthenticatedServiceError } from './errors';
import { isAuthenticated } from './is-authenticated';

export function assertAuthenticated(
  auth: AuthenticationContext | undefined
): asserts auth is AuthenticatedContext {
  if (!isAuthenticated(auth)) {
    throw new UnauthenticatedServiceError(auth);
  }
}
