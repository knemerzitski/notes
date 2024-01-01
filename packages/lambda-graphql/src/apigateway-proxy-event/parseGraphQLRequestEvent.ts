import { HTTPGraphQLRequest } from '@apollo/server';
import { APIGatewayProxyEvent } from 'aws-lambda';

import parseApolloHeaders from './parseApolloHeaders';
import parseBody from './parseBody';
import parseQueryParams from './parseQueryParams';

export default function parseGraphQLRequestEvent(
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
