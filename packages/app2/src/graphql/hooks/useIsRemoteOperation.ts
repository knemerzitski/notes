import { DocumentNode } from '@apollo/client';
import { isRemoteOperation } from '../utils/is-remote-operation';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';

/**
 * @returns Given document is only meant for server usage
 */
export function useIsRemoteOperation(document: DocumentNode) {
  const isLocalOnlyUser = useIsLocalOnlyUser();

  return isRemoteOperation(document, isLocalOnlyUser);
}
