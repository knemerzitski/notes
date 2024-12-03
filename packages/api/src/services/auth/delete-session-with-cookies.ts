import { ObjectId } from 'mongodb';

import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { deleteByCookieId } from '../../mongodb/models/session/delete-by-cookie-id';
import { Cookies } from '../http/cookies';

export interface DeleteSessionWithCookiesParams {
  userId: ObjectId;
  cookieId?: string;
  cookies: Cookies;
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
  };
}

/**
 * Deletes session from database and Cookies instance
 */
export async function deleteSessionWithCookies({
  userId,
  cookieId,
  cookies,
  mongoDB,
}: DeleteSessionWithCookiesParams) {
  if (cookieId) {
    await deleteByCookieId({
      mongoDB,
      cookieId,
    });
  }
  cookies.deleteSessionCookieId(userId);
}
