import { DocumentNode } from 'graphql/index';

import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { isRemoteOperation } from '../utils/is-remote-operation';

/**
 * @returns Given document is only meant for server usage
 */
export function useIsRemoteOperation(document: DocumentNode) {
  const isLocalOnlyUser = useIsLocalOnlyUser();

  return isRemoteOperation(document, isLocalOnlyUser);
}
