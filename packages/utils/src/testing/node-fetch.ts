import { FetchFn } from './types';

export const nodeFetch: FetchFn = async function (options) {
  const res = await fetch(options.url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });

  return {
    json: res.json.bind(res),
    headers: {
      get entries() {
        return [...res.headers.entries()];
      },
      getSetCookie: res.headers.getSetCookie.bind(res.headers),
    },
    status: res.status,
  };
};
