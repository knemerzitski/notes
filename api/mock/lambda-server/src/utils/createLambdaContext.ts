import { Context } from 'aws-lambda';

import contextFixture from '../../fixtures/context.json';

export function createLambdaContext(): Context {
  const contextCopy: typeof contextFixture = JSON.parse(JSON.stringify(contextFixture));
  return {
    ...contextCopy,
    identity: contextFixture.identity ?? undefined,
    clientContext: contextFixture.clientContext ?? undefined,
    getRemainingTimeInMillis() {
      return Number.MAX_SAFE_INTEGER;
    },
    done: function () {
      throw new Error('Function not implemented.');
    },
    fail: function () {
      throw new Error('Function not implemented.');
    },
    succeed: function () {
      throw new Error('Function not implemented.');
    },
  };
}
