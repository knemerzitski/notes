import { HTTPGraphQLRequest } from '@apollo/server';
import { APIGatewayProxyEvent } from 'aws-lambda';

import { parseApolloHeaders } from './parse-apollo-headers';
import { parseBody } from './parse-body';
import { parseQueryParams } from './parse-query-params';

export function parseGraphQLRequestEvent(
  event: APIGatewayProxyEvent
): HTTPGraphQLRequest {
  const headers = parseApolloHeaders(event);
  return {
    method: event.httpMethod,
    headers,
    search: parseQueryParams(event),
    body: parseBody(event, headers),
  };
}
