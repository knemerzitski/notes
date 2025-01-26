
import { ObjectId } from 'mongodb';

import { AuthenticationFailedReason } from '~api-app-shared/graphql/error-codes';

import { wrapArray } from '~utils/array/wrap-array';
import { isDefined } from '~utils/type-guards/is-defined';

import { AuthenticatedContextsModel } from '../../models/auth/authenticated-contexts';
import { CurrentUserModel } from '../../models/auth/current-user';
import { CollectionName, MongoDBCollections } from '../../mongodb/collections';
import { MongoDBLoaders } from '../../mongodb/loaders';
import { deleteManyByCookieIds } from '../../mongodb/models/session/delete-many-by-cookie-ids';
import { objectIdToStr, strToObjectId } from '../../mongodb/utils/objectid';
import { SessionsCookie } from '../http/sessions-cookie';
import { SessionDuration, SessionDurationConfig } from '../session/duration';
import { insertSession } from '../session/insert-session';

import { UnauthenticatedServiceError } from './errors';


import { findRefreshSessionByCookieId } from './find-refresh-session-by-cookie-id';





import {
  AuthenticatedContext,
  AuthenticationService,
  SingleUserAuthenticationService,
} from './types';

/**
 * Authentication service based on request cookie headers.
 * Session is stored in MongoDB.
 * DynamoDB stores active connection that has a copy of the session.
 */
export class CookiesMongoDBDynamoDBAuthenticationService
  implements AuthenticationService
{
  constructor(
    private readonly ctx: {
      readonly mongoDB: {
        readonly collections: Pick<MongoDBCollections, CollectionName.SESSIONS>;
        readonly loaders: Pick<MongoDBLoaders, 'session'>;
      };
      readonly options?: {
        readonly sessions?: {
          readonly user?: SessionDurationConfig;
        };
      };
      readonly sessionsCookie?: SessionsCookie;
    },
    private readonly model = new AuthenticatedContextsModel()
  ) {}

  async createAuth(userId: string | ObjectId): Promise<AuthenticatedContext> {
    const userIdStr = objectIdToStr(userId);

    // Update MongoDB (persist in DB)
    const session = await insertSession({
      mongoDB: this.ctx.mongoDB,
      userId: strToObjectId(userId),
      duration: new SessionDuration(
        this.ctx.options?.sessions?.user ?? {
          duration: 1000 * 60 * 60 * 24 * 14, // 14 days,
          refreshThreshold: 0.5, // 7 days
        }
      ),
    });

    const auth: AuthenticatedContext = {
      session,
    };

    // Update cookies (persist in client)
    this.ctx.sessionsCookie?.update(userId, session.cookieId);

    // Update Local state (persist in memory)
    this.model.set(userIdStr, auth);

    return auth;
  }

  async deleteAuthByUserId(
    userId: string | ObjectId | (string | ObjectId)[]
  ): Promise<void> {
    const userIdStrs = wrapArray(userId).map(objectIdToStr).filter(isDefined);
    const auths = userIdStrs.map((userId) => this.model.get(userId)).filter(isDefined);
    const cookieIds = auths.map((auth) => auth.session.cookieId);

    // Update MongoDB (persist in DB)
    await deleteManyByCookieIds({
      mongoDB: this.ctx.mongoDB,
      cookieIds,
    });

    // Update response header cookies (persist in client)
    this.ctx.sessionsCookie?.delete(userIdStrs);

    // Update Local state (persist in memory)
    userIdStrs.forEach((userIdStr) => {
      this.model.delete(userIdStr);
    });
  }

  async deleteAllAuth(): Promise<void> {
    const auths = this.model.values();
    const cookieIds = auths.map((auth) => auth.session.cookieId);

    // Update MongoDB (persist in DB)
    await deleteManyByCookieIds({
      mongoDB: this.ctx.mongoDB,
      cookieIds,
    });

    // Update response header cookies (persist in client)
    this.ctx.sessionsCookie?.clear();

    // Update Local state (persist in memory)
    this.model.clear();
  }

  async isAuthenticated(userId: string | ObjectId): Promise<boolean> {
    const userIdStr = objectIdToStr(userId);
    const auth = this.model.get(userIdStr);

    if (auth) {
      return true;
    }

    const cookieId = this.ctx.sessionsCookie?.get(userId);
    if (!cookieId) {
      return false;
    }

    try {
      // Query for session MongoDB (persist in DB)
      const session = await findRefreshSessionByCookieId(cookieId, this.ctx);

      const auth: AuthenticatedContext = {
        session,
      };

      // Update Local state (persist in memory)
      this.model.set(userIdStr, auth);

      return true;
    } catch (err) {
      if (err instanceof UnauthenticatedServiceError) {
        return false;
      } else {
        throw err;
      }
    }
  }

  async getAuth(userId: string | ObjectId): Promise<AuthenticatedContext> {
    const userIdStr = objectIdToStr(userId);
    let auth = this.model.get(userIdStr);

    if (!auth) {
      const cookieId = this.ctx.sessionsCookie?.get(userId);
      if (!cookieId) {
        throw new UnauthenticatedServiceError(AuthenticationFailedReason.USER_NO_SESSION);
      }

      // Query/update database for a session and create auth
      // Update MongoDB (persist in DB)
      const session = await findRefreshSessionByCookieId(cookieId, this.ctx);

      auth = {
        session,
      };

      // Update Local state (persist in memory)
      this.model.set(userIdStr, auth);
    }

    return auth;
  }

  getAvailableUserIds(): ObjectId[] {
    return [
      ...new Set([
        ...this.model.values().map((value) => objectIdToStr(value.session.userId)),
        ...(this.ctx.sessionsCookie?.getUserIds().map(objectIdToStr) ?? []),
      ]).values(),
    ]
      .map(strToObjectId)
      .filter(isDefined);
  }
}

export class CookiesMongoDBDynamoDBSingleUserAuthenticationService
  implements SingleUserAuthenticationService
{
  constructor(
    private readonly service: AuthenticationService,
    private readonly model = new CurrentUserModel()
  ) {}

  getUserId(): ObjectId | undefined {
    return this.model.userId;
  }

  isAuthenticated(): Promise<boolean> {
    if (!this.model.userId) {
      return Promise.resolve(false);
    }

    return this.service.isAuthenticated(this.model.userId);
  }

  getAuth(): Promise<AuthenticatedContext> {
    if (!this.model.userId) {
      throw new UnauthenticatedServiceError(AuthenticationFailedReason.USER_UNDEFINED);
    }

    return this.service.getAuth(this.model.userId);
  }
}