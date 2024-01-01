import { HeaderMap } from '@apollo/server';
import { APIGatewayProxyEvent } from 'aws-lambda';

export default function parseBody(event: APIGatewayProxyEvent, headers: HeaderMap) {
  if (event.body) {
    const contentType = headers.get('content-type');
    const parsedBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    if (contentType?.startsWith('application/json')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(parsedBody);
    }
    if (contentType?.startsWith('text/plain')) {
      return parsedBody;
    }
  }
  return '';
}
