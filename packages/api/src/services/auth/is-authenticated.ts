import { AuthenticationContext, UnauthenticatedContext } from './authentication-context';

export function isAuthenticated<T extends AuthenticationContext>(
  auth: T | undefined
): auth is Exclude<T, UnauthenticatedContext> {
  return !!auth && !('reason' in auth);
}
