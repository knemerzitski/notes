type ValueAttributeObject = { value?: string; attributes?: string };
type WithMultiValue<T> = T & { multiValue?: T[] };
type MultiValueRecord = Record<string, WithMultiValue<ValueAttributeObject> | undefined>;

interface Event {
  version: string;
  context: {
    distributionDomainName: string;
    distributionId: string;
    eventType: 'viewer-request' | 'viewer-response';
    requestId: string;
  };
  viewer: {
    ip: string;
  };
  request?: {
    readonly method: string;
    uri: string;
    querystring: MultiValueRecord;
    headers: MultiValueRecord;
    cookies: MultiValueRecord;
  };
  response?: {
    statusCode: number;
    statusDescription?: string;
    headers?: MultiValueRecord;
    cookies?: MultiValueRecord;
    body?: {
      encoding: string;
      data: string;
    };
  };
}

function objectToQueryString(queryObj: MultiValueRecord) {
  const strArr: string[] = [];
  for (const key in queryObj) {
    const value = queryObj[key]?.value;
    if (value == null) continue;

    if (value == '') {
      strArr.push(encodeURIComponent(key));
    } else {
      strArr.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    }
  }
  return strArr.join('&');
}

function objectToFullQueryString(queryObj: MultiValueRecord) {
  return Object.keys(queryObj).length > 0 ? `?${objectToQueryString(queryObj)}` : '';
}

function uriHasExtension(uri: string) {
  const lastSlashIndex = uri.lastIndexOf('/');
  if (lastSlashIndex === -1) return false;
  const dotIndex = uri.indexOf('.', lastSlashIndex + 1);
  if (dotIndex === -1 || dotIndex === uri.length - 1) return false;

  return true;
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function handler(event: Event): Event['request'] | Event['response'] {
  const request = event.request;
  if (!request) return request;

  let uri = request.uri;
  const host = request.headers.host?.value;
  if (!host) return request;

  let query: string;

  // Redirect aliases to main domain
  const expectedHost = process.env.PRIMARY_DOMAIN;
  if (expectedHost != null && host !== expectedHost) {
    query = objectToFullQueryString(request.querystring);

    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: `https://${expectedHost}${uri}${query}` },
      },
    };
  }

  // Enforce no trailing slash except root /
  if (uri.endsWith('/') && uri.length > 1) {
    uri = uri.replace(/(\/)+$/, '');
    if (!uri) {
      uri = '/';
    }

    query = objectToFullQueryString(request.querystring);

    return {
      statusCode: 308,
      statusDescription: 'Permanent Redirect',
      headers: {
        location: { value: `${uri}${query}` },
      },
    };
  }

  // Rewrite .webp to .jpg if browser doesn't support image/webp
  if (uri.endsWith('.webp')) {
    const accept = request.headers.accept?.value;
    if (accept != null && !accept.includes('image/webp')) {
      request.uri = `${uri.slice(0, -5)}.jpg`;
    }
    return request;
  }

  // Rewrite path without extension to index.html
  if (uri !== '/' && !uriHasExtension(uri)) {
    request.uri = '/index.html';
    return request;
  }

  return request;
}

export const exportedForTesting_handler = handler;
