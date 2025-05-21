import { useCollabServiceManager } from '../context/collab-service-manager';
import { useUserNoteLinkId } from '../context/user-note-link-id';
import { NoteCollabFacade } from '../types';

export function useCollabFacade(): NoteCollabFacade {
  const userNoteLinkId = useUserNoteLinkId();
  const collabServiceManager = useCollabServiceManager();

  const collabFacade = collabServiceManager.getOrCreate(userNoteLinkId);

  if (!collabFacade.initStatus.isPending) {
    return collabFacade.get();
  } else {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw collabFacade.initStatus.completion;
  }
}
