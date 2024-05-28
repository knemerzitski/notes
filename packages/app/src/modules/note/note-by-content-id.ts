import { ApolloCache, Reference } from '@apollo/client';
import { getCurrentUserId } from '../auth/user';

/**
 * Access current user note by Note.contentId
 */
const noteByContentId: Record<string, Reference> = {};
// TODO separate per user?

function getKey<TCacheShape>(cache: ApolloCache<TCacheShape>, contentId: string) {
  const userId = getCurrentUserId(cache);
  if (!userId) return;
  return `${userId}:${contentId}`;
}

export function addNoteReferenceByContentId<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  contentId: string,
  noteReference: Reference
) {
  const key = getKey(cache, contentId);
  if (!key) return false;

  noteByContentId[key] = noteReference;

  return true;
}

export function getNoteReferenceByContentId<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  contentId: string
) {
  const key = getKey(cache, contentId);
  if (!key) return;

  return noteByContentId[key];
}

export function removeNoteReferenceByContentId<TCacheShape>(
  cache: ApolloCache<TCacheShape>,
  contentId: string
) {
  const key = getKey(cache, contentId);
  if (!key) return false;

  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete noteByContentId[key];

  return true;
}
