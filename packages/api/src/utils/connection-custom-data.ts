import { Infer, InferRaw, object } from 'superstruct';

import { AuthenticatedContextsModelInstanceStruct } from '../models/auth/authenticated-contexts';
import { SessionsCookieModelInstanceStruct } from '../models/http/sessions-cookie';

const ConnectionCustomDataStruct = object({
  sessionsCookie: SessionsCookieModelInstanceStruct,
  authenticatedContexts: AuthenticatedContextsModelInstanceStruct,
});

export type ConnectionCustomData = Infer<typeof ConnectionCustomDataStruct>;

export type SerializedConnectionCustomData = InferRaw<typeof ConnectionCustomDataStruct>;

export function serializeConnectionCustomData(
  value: ConnectionCustomData
): SerializedConnectionCustomData {
  return ConnectionCustomDataStruct.createRaw(value);
}

export function parseConnectionCustomData(value: unknown): ConnectionCustomData {
  return ConnectionCustomDataStruct.create(value);
}
