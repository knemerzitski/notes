import { Reference } from '@apollo/client';
import { readSessionContext } from '../auth/state/persistence';

/**
 * Access current user note by Note.contentId
 */
const noteByContentId: Record<string, Reference> = {};

function getKey(contentId: string) {
  const sessions = readSessionContext();
  const userId = sessions?.currentSession.id;
  if (!userId) return;
  return `${userId}:${contentId}`;
}

export function addNoteReferenceByContentId(contentId: string, noteReference: Reference) {
  const key = getKey(contentId);
  if (!key) return false;

  noteByContentId[key] = noteReference;

  return true;
}

export function getNoteReferenceByContentId(contentId: string) {
  const key = getKey(contentId);
  if (!key) return;

  return noteByContentId[key];
}

export function removeNoteReferenceByContentId(contentId: string) {
  const key = getKey(contentId);
  if (!key) return false;

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete noteByContentId[key];

  return true;
}
