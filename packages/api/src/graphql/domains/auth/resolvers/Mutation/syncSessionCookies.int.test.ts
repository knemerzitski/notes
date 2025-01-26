import { ObjectId } from 'mongodb';
import { expect, it } from 'vitest';

import { apolloServer } from '../../../../../__tests__/helpers/graphql/apollo-server';
import {
  CreateGraphQLResolversContextOptions,
  createGraphQLResolversContext,
} from '../../../../../__tests__/helpers/graphql/graphql-context';
import { expectGraphQLResponseData } from '../../../../../__tests__/helpers/graphql/response';
import { SessionSchema } from '../../../../../mongodb/schema/session';
import { objectIdToStr } from '../../../../../mongodb/utils/objectid';
import { Cookies } from '../../../../../services/http/cookies';
import { SessionsCookie } from '../../../../../services/http/sessions-cookie';
import {
  SyncSessionCookiesInput,
  SyncSessionCookiesPayload,
} from '../../../types.generated';

interface Variables {
  input: SyncSessionCookiesInput;
}

const MUTATION = `#graphql
  mutation SignOut($input: SyncSessionCookiesInput!) {
    syncSessionCookies(input: $input) {
      availableUserIds
    }
  }
`;

async function executeOperation(
  input: Variables['input'],
  options?: CreateGraphQLResolversContextOptions,
  query: string = MUTATION
) {
  return await apolloServer.executeOperation<
    {
      syncSessionCookies: SyncSessionCookiesPayload;
    },
    Variables
  >(
    {
      query,
      variables: {
        input,
      },
    },
    {
      contextValue: createGraphQLResolversContext(options),
    }
  );
}

it('removes userIds in cookies not known to client', async () => {
  const userId = new ObjectId();
  const cookieId = SessionSchema.schema.cookieId.create(undefined);

  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });

  sessionsCookie.update(userId, cookieId);
  sessionsCookie.update(new ObjectId(), SessionSchema.schema.cookieId.create(undefined));

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  const response = await executeOperation(
    {
      availableUserIds: [objectIdToStr(userId)],
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUserIds: [objectIdToStr(userId)],
    },
  });

  expect(context.services.auth.getAvailableUserIds().map(objectIdToStr)).toStrictEqual([
    objectIdToStr(userId),
  ]);

  expect(cookies.getMultiValueHeadersSetCookies()).toStrictEqual([
    `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
  ]);
});

it('ignores unknown client userIds not in cookies', async () => {
  const userId = new ObjectId();
  const unknownUserId = new ObjectId();
  const cookieId = SessionSchema.schema.cookieId.create(undefined);

  const cookies = new Cookies();
  const sessionsCookie = new SessionsCookie({
    cookies,
  });

  sessionsCookie.update(userId, cookieId);

  const context = createGraphQLResolversContext({
    sessionsCookie,
  });

  const response = await executeOperation(
    {
      availableUserIds: [objectIdToStr(userId), objectIdToStr(unknownUserId)],
    },
    {
      contextValue: context,
    }
  );

  const data = expectGraphQLResponseData(response);
  expect(data).toEqual({
    syncSessionCookies: {
      availableUserIds: [objectIdToStr(userId)],
    },
  });

  expect(context.services.auth.getAvailableUserIds().map(objectIdToStr)).toStrictEqual([
    objectIdToStr(userId),
  ]);

  expect(cookies.getMultiValueHeadersSetCookies()).toStrictEqual([
    `Sessions=${objectIdToStr(userId)}:${cookieId}; HttpOnly; SameSite=Strict; Path=/`,
  ]);
});
