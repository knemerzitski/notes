/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { DeepPartial } from 'ts-essentials';
import { it, vi, expect } from 'vitest';
import { afterEach, beforeEach, describe } from 'vitest';

import { exportedForTesting_handler } from './viewer-request';

const handler = exportedForTesting_handler;

type Event = Parameters<typeof handler>[0];

function createEvent(override?: DeepPartial<Event>): Event {
  return {
    version: '1.0',
    ...override,
    context: {
      distributionDomainName: 'd123.cloudfront.net',
      distributionId: 'E123',
      eventType: 'viewer-request',
      requestId: '4TyzHTaYWb1GX1qTfsHhEqV6HUDd_BzoBZnwfnvQc_1oF26ClkoUSEQ==',
      ...override?.context,
    },
    viewer: { ip: '1.2.3.4', ...override?.viewer },
    request: {
      method: 'GET',
      uri: '/index.html',
      ...override?.request,
      querystring: { querykey: { value: 'queryval' }, ...override?.request?.querystring },
      headers: { headerkey: { value: 'headerval' }, ...override?.request?.headers },
      cookies: { cookiekey: { value: 'cookieval' }, ...override?.request?.cookies },
    },
  } as Event;
}

it('handles barebone event', () => {
  handler(createEvent());
});

describe('with primary domain defined', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...process.env,
      PRIMARY_DOMAIN: 'website.com',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('redirects alias/subdomain to main domain', () => {
    expect(
      handler(
        createEvent({
          request: {
            headers: {
              host: {
                value: 'deep.sub.website.com',
              },
            },
          },
        })
      )
    ).toStrictEqual({
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://website.com/index.html?querykey=queryval' },
      },
    });
  });
});

it('enforces no trailing slash', () => {
  expect(
    handler(
      createEvent({
        request: {
          uri: 'index.html/trail/',
          headers: {
            host: {
              value: 'website.com',
            },
          },
        },
      })
    )
  ).toStrictEqual({
    statusCode: 308,
    statusDescription: 'Permanent Redirect',
    headers: {
      location: { value: 'index.html/trail?querykey=queryval' },
    },
  });
});

it('allows trailing slash on root', () => {
  const event = createEvent({
    request: {
      uri: '/',
      headers: {
        host: {
          value: 'website.com',
        },
      },
    },
  });
  expect(handler(JSON.parse(JSON.stringify(event)))).toStrictEqual(event.request);
});

it('rewrites .webp to .jpg if .webp is not supported', () => {
  const event = createEvent({
    request: {
      uri: 'image.webp',
      headers: {
        host: {
          value: 'website.com',
        },
        accept: {
          value: '',
        },
      },
    },
  });
  expect((handler(createEvent(event)) as Event['request'])?.uri).toStrictEqual(
    'image.jpg'
  );
});

it('keeps .webp to .jpg if .webp is supported', () => {
  const event = createEvent({
    request: {
      uri: 'image.webp',
      headers: {
        host: {
          value: 'website.com',
        },
        accept: {
          value: 'image/webp',
        },
      },
    },
  });
  expect(handler(JSON.parse(JSON.stringify(event)))).toStrictEqual(event.request);
});

it('rewrites any uri without extension to index.html', () => {
  const event = createEvent({
    request: {
      uri: '/u/a/b',
      headers: {
        host: {
          value: 'website.com',
        },
      },
    },
  });
  expect(handler(JSON.parse(JSON.stringify(event)))).toStrictEqual({
    ...event.request,
    uri: '/index.html',
  });
});

it('keeps uri with extension', () => {
  const event = createEvent({
    request: {
      uri: '/u/someimage.jpg',
      headers: {
        host: {
          value: 'website.com',
        },
      },
    },
  });
  expect(handler(JSON.parse(JSON.stringify(event)))).toStrictEqual(event.request);
});
