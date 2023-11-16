import { isArray } from '@/utils/isArray';
import { Logger } from '@/utils/logger';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import express from 'express';

import apiGatewayProxyEventFixture from '../../fixtures/apiGatewayProxyEvent.json';
import { createLambdaContext } from '../utils/createLambdaContext';

export function proxyEventApolloMiddleware({
  logger,
  handler,
}: {
  handler: APIGatewayProxyHandler;
  logger: Logger;
}) {
  const middleware: express.RequestHandler = async (req, res) => {
    try {
      const event = expressRequestToApiGatewayProxyEvent(req);

      const result = await handler(event, createLambdaContext(), () => {});

      apiGatewayProxyApolloResultToExpressResponse(res, result);
    } catch (err) {
      logger.error('handler:HTTP', err as Error);
      res.status(500).json(err);
    }
  };
  return middleware;
}

function expressRequestToApiGatewayProxyEvent(
  req: Parameters<express.RequestHandler>[0]
): APIGatewayProxyEvent {
  const eventCopy: typeof apiGatewayProxyEventFixture = JSON.parse(
    JSON.stringify(apiGatewayProxyEventFixture)
  );

  return {
    ...eventCopy,
    isBase64Encoded: false,
    body: req.body,
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

function apiGatewayProxyApolloResultToExpressResponse(
  res: Parameters<express.RequestHandler>[1],
  result: APIGatewayProxyResult | void
): void {
  if (!result) {
    res.status(200).send('OK').end();
    return;
  }

  res.status(result.statusCode);

  // Store all headers in one place before setting them in response
  const multiHeaders: Record<string, Set<string>> = {};
  if (result.headers) {
    Object.entries(result.headers).forEach(([key, value]) => {
      if (!(key in multiHeaders)) {
        multiHeaders[key] = new Set();
      }
      multiHeaders[key].add(String(value));
    });
  }
  if (result.multiValueHeaders) {
    Object.entries(result.multiValueHeaders).forEach(([key, values]) => {
      if (!(key in multiHeaders)) {
        multiHeaders[key] = new Set();
      }
      values.forEach((value) => {
        multiHeaders[key].add(String(value));
      });
    });
  }

  Object.entries(multiHeaders).forEach(([key, valueSet]) => {
    valueSet.forEach((value) => {
      res.setHeader(key, String(value));
    });
  });

  const body = result.isBase64Encoded
    ? Buffer.from(result.body, 'base64').toString('utf-8')
    : result.body;

  res.send(body);
}
