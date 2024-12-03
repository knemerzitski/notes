import { beforeAll } from 'vitest';

import { assertDynamoDBIsReachable, dynamoDBDocumentClient } from './dynamodb';

beforeAll(async () => {
  await assertDynamoDBIsReachable(dynamoDBDocumentClient);
});
