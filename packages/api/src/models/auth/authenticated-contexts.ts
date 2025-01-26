import mitt, { Emitter } from 'mitt';
import { coerce, Infer, instance, object, record, string, unknown } from 'superstruct';

import { ObjectIdStrStruct } from '../../mongodb/models/object-id';
import { DateNumberStruct } from '../date';

interface AuthenticatedContextsModelEvents {
  set: {
    auth: AuthenticatedContext;
  };
  deleted: {
    auth: AuthenticatedContext;
  };
}

/**
 * Based on SessionSchema
 */
const SerializableSessionStruct = object({
  _id: ObjectIdStrStruct,
  cookieId: string(),
  userId: ObjectIdStrStruct,
  expireAt: DateNumberStruct,
});

const AuthenticatedContextStruct = object({
  session: SerializableSessionStruct,
});

export type AuthenticatedContext = Infer<typeof AuthenticatedContextStruct>;

const AuthenticatedContextsModelStruct = object({
  authByUserId: record(string(), AuthenticatedContextStruct),
});

export class AuthenticatedContextsModel {
  private readonly _eventBus: Emitter<AuthenticatedContextsModelEvents> = mitt();
  get eventBus(): Pick<Emitter<AuthenticatedContextsModelEvents>, 'on' | 'off'> {
    return this._eventBus;
  }

  constructor(private authByUserId: Record<string, AuthenticatedContext> = {}) {}

  values() {
    return Object.values(this.authByUserId);
  }

  set(key: string, auth: AuthenticatedContext) {
    const existingAuth = this.authByUserId[key];
    if (existingAuth === auth) {
      return;
    }

    this.authByUserId[key] = auth;

    this._eventBus.emit('set', {
      auth,
    });
  }

  delete(key: string) {
    const auth = this.authByUserId[key];
    if (!auth) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.authByUserId[key];

    this._eventBus.emit('deleted', {
      auth,
    });
  }

  get(key: string) {
    return this.authByUserId[key];
  }

  clear() {
    const deletedAuths = Object.values(this.authByUserId);

    this.authByUserId = {};

    deletedAuths.forEach((auth) => {
      this._eventBus.emit('deleted', {
        auth,
      });
    });
  }
}

export const AuthenticatedContextsModelInstanceStruct = coerce(
  instance(AuthenticatedContextsModel),
  unknown(),
  (value) => {
    const parsedValue = AuthenticatedContextsModelStruct.mask(value);
    return new AuthenticatedContextsModel(parsedValue.authByUserId);
  },
  (value) => AuthenticatedContextsModelStruct.maskRaw(value)
);
