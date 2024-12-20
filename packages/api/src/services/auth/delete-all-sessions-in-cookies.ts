import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { deleteManyByCookieIds } from '../../mongodb/models/session/delete-many-by-cookie-ids';
import { Cookies } from '../http/cookies';

export interface DeleteAllSessionsInCookiesParams {
  cookies: Cookies;
  mongoDB: {
    collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
  };
}

export async function deleteAllSessionsInCookies({
  cookies,
  mongoDB,
}: DeleteAllSessionsInCookiesParams) {
  const cookieIds = cookies.getAvailableSessionCookieIds();
  if (cookieIds.length > 0) {
    await deleteManyByCookieIds({
      mongoDB,
      cookieIds,
    });
  }

  cookies.clearSessions();
}
