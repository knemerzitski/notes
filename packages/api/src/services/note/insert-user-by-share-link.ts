import { MongoClient, ObjectId } from 'mongodb';

import { Maybe } from '../../../../utils/src/types';

import { CollectionName } from '../../mongodb/collection-names';
import { MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';

import { NoteByShareLinkNotFoundQueryLoaderError } from '../../mongodb/loaders/note-by-share-link/loader';
import { insertNoteUser } from '../../mongodb/models/note/insert-note-user';

import { NoteUserSchema } from '../../mongodb/schema/note-user';

import { withTransaction } from '../../mongodb/utils/with-transaction';

import {
  NoteByShareLinkNotFoundServiceError,
  NoteUserCountLimitReachedServiceError,
} from './errors';
import { findNoteUser } from './note';

export async function insertUserByShareLink({
  mongoDB,
  userId,
  shareLinkId,
  categoryName,
  maxUsersCount,
}: {
  mongoDB: {
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.NOTES | CollectionName.USERS>;
    loaders: Pick<MongoDBLoaders, 'noteByShareLink'>;
  };
  /**
   * User who is trying to access the note
   */
  userId: ObjectId;
  /**
   * Target Note.shareLinks._id
   */
  shareLinkId: ObjectId;
  /**
   * Category where to put the note
   */
  categoryName: string;
  /**
   * Maximum numer of allowed users in the note via sharing.
   * Leave undefined for unlimited.
   */
  maxUsersCount?: Maybe<number>;
}) {
  return withTransaction(
    mongoDB.client,
    async ({ runSingleOperation, session }) => {
      try {
        const note = await mongoDB.loaders.noteByShareLink.load(
          {
            id: {
              shareLinkId,
            },
            query: {
              _id: 1,
              users: {
                _id: 1,
                categoryName: 1,
                createdAt: 1,
                readOnly: 1,
              },
              shareLinks: {
                _id: 1,
                expireAccessCount: 1,
                expireAt: 1,
                permissions: {
                  user: {
                    readOnly: 1,
                  },
                },
              },
              collabText: {
                headRecord: {
                  revision: 1,
                },
              },
            },
          },
          {
            session,
          }
        );

        const now = Date.now();
        const shareLink = note.shareLinks?.find(
          ({ _id, expireAccessCount, expireAt }) => {
            if (!shareLinkId.equals(_id)) return false;

            if (expireAccessCount != null && expireAccessCount <= 0) {
              return false;
            }

            if (expireAt && expireAt.getTime() <= now) {
              return false;
            }

            return true;
          }
        );

        if (!shareLink) {
          throw new NoteByShareLinkNotFoundServiceError(shareLinkId);
        }

        const noteUser = findNoteUser(userId, note);
        if (noteUser) {
          return {
            type: 'already_user' as const,
            noteUser,
            note,
          };
        }

        const usersCount = note.users.length;
        const hasUserCountLimitReached =
          maxUsersCount != null && usersCount >= maxUsersCount;
        if (hasUserCountLimitReached) {
          throw new NoteUserCountLimitReachedServiceError(usersCount);
        }

        const newNoteUser: NoteUserSchema = {
          _id: userId,
          categoryName,
          createdAt: new Date(),
          readOnly: shareLink.permissions?.user?.readOnly ?? false,
        };
        if (note.collabText) {
          newNoteUser.collabTextHeadRevisionAtCreation =
            note.collabText.headRecord.revision;
        }

        await insertNoteUser({
          mongoDB: {
            ...mongoDB,
            runSingleOperation,
          },
          noteId: note._id,
          noteUser: newNoteUser,
          shareLink:
            shareLink.expireAccessCount != null
              ? {
                  _id: shareLink._id,
                  expireAccessCount: shareLink.expireAccessCount - 1,
                }
              : undefined,
        });

        mongoDB.loaders.noteByShareLink.prime(
          {
            id: {
              shareLinkId,
            },
          },
          {
            _id: note._id,
            users: [...note.users, newNoteUser],
          }
        );

        return {
          type: 'success' as const,
          noteUser: newNoteUser,
          note,
        };
      } catch (err) {
        if (err instanceof NoteByShareLinkNotFoundQueryLoaderError) {
          throw new NoteByShareLinkNotFoundServiceError(shareLinkId);
        }
        throw err;
      }
    },
    {
      skipAwaitFirstOperation: true,
    }
  );
}
