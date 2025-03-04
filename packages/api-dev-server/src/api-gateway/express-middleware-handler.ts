import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import express from 'express';

import { isArray } from '../../../utils/src/array/is-array';
import { Logger } from '../../../utils/src/logging';

import apiGatewayProxyEventFixture from '../../fixtures/apiGatewayProxyEvent.json';
import { getDistinctMultiValueHeaders } from '../utils/headers';
import { createLambdaContext } from '../utils/lambda-context';

export function apiGatewayProxyHandlerMiddleware({
  logger,
  handler,
}: {
  handler: APIGatewayProxyHandler;
  logger: Logger;
}) {
  const middleware: express.RequestHandler = (req, res) => {
    void (async () => {
      try {
        const event = expressRequestToProxyEvent(req);

        const result = await handler(event, createLambdaContext(), () => {
          return;
        });

        proxyEventToExpressResponse(res, result);
      } catch (err) {
        logger.error('handler:HTTP', err as Error);
        res.status(500).json(err);
      }
    })();
  };
  return middleware;
}

function expressRequestToProxyEvent(
  req: Parameters<express.RequestHandler>[0]
): APIGatewayProxyEvent {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const eventCopy: typeof apiGatewayProxyEventFixture = JSON.parse(
    JSON.stringify(apiGatewayProxyEventFixture)
  );

  return {
    ...eventCopy,
    isBase64Encoded: false,
    body: String(req.body),
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        isArray(value) ? value[0] : value,
      ])
    ),
    multiValueHeaders: req.headersDistinct,
    httpMethod: req.method,
    path: req.path,
    queryStringParameters: req.params,
  };
}

function proxyEventToExpressResponse(
  res: Parameters<express.RequestHandler>[1],
  result: APIGatewayProxyResult | void
): void {
  if (!result) {
    res.status(200).send('OK').end();
    return;
  }

  res.status(result.statusCode);

  Object.entries(
    getDistinctMultiValueHeaders(result.headers, result.multiValueHeaders)
  ).forEach(([key, values]) => {
    res.setHeader(key, values);
  });

  const body = result.isBase64Encoded
    ? Buffer.from(result.body, 'base64').toString('utf-8')
    : result.body;

  res.send(body);
}
