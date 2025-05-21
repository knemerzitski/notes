import { CollabService } from '../../../../collab/src';

import { useCollabFacade } from './useCollabFacade';

export function useCollabService(): CollabService {
  const collabFacade = useCollabFacade();

  return collabFacade.fieldCollab.service;
}
