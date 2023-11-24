import { HeaderMap } from '@apollo/server';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default function parseApolloHeaders(event: APIGatewayProxyEvent) {
  const headerMap = new HeaderMap();
  for (const [key, value] of Object.entries(event.headers)) {
    headerMap.set(key, value ?? '');
  }
  return headerMap;
}
