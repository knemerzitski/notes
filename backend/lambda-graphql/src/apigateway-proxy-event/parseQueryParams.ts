import { APIGatewayProxyEvent } from 'aws-lambda';

export default function parseQueryParams(event: APIGatewayProxyEvent) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(
    event.multiValueQueryStringParameters ?? {}
  )) {
    for (const v of value ?? []) {
      params.append(key, decodeURIComponent(v));
    }
  }
  return params.toString();
}
