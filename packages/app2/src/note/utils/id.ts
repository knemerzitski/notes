import { ApolloCache } from '@apollo/client';
import {
  Note,
  SignedInUser,
  UserNoteLink,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { getCurrentUserId } from '../../user/models/signed-in-user/get-current';

interface ParsedUserNoteLinkId {
  noteId: Note['id'];
  userId: SignedInUser['id'];
}

export function getUserNoteLinkId(noteId: Note['id'], userId: SignedInUser['id']) {
  return `${noteId}:${userId}`;
}

export function parseUserNoteLinkId(
  userNoteLinkId: UserNoteLink['id']
): ParsedUserNoteLinkId {
  const [noteId, userId] = userNoteLinkId.split(':');
  if (!noteId || !userId) {
    throw new Error(`Invalid userNoteLinkId "${userNoteLinkId}"`);
  }

  return {
    noteId,
    userId,
  };
}

export function getUserNoteLinkIdFromByInput(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): UserNoteLink['id'] {
  if (by.id != null) {
    return by.id;
  } else if (by.userNoteLinkId != null) {
    return by.userNoteLinkId;
  } else {
    const userId = getCurrentUserId(cache);
    if (!userId) {
      throw new Error('Expected current userId to be defined');
    }
    return getUserNoteLinkId(by.noteId, userId);
  }
}

export function parseUserNoteLinkByInput(
  by: UserNoteLinkByInput,
  cache: Pick<ApolloCache<unknown>, 'readQuery'>
): ParsedUserNoteLinkId {
  if (by.id != null) {
    return parseUserNoteLinkId(by.id);
  } else if (by.userNoteLinkId != null) {
    return parseUserNoteLinkId(by.userNoteLinkId);
  } else {
    const userId = getCurrentUserId(cache);
    if (!userId) {
      throw new Error('Expected current userId to be defined');
    }
    return parseUserNoteLinkId(getUserNoteLinkId(by.noteId, userId));
  }
}

export function getCollabTextId(noteId: string) {
  return noteId;
}

export function getCollabTextRecordId(collabTextId: string, revision: number) {
  return `${collabTextId}:${revision}`;
}
