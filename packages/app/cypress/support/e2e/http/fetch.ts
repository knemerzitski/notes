import { FetchFn } from '../../../../../utils/src/testing/types';

export const cyRequestFetchFn: FetchFn = function (options) {
  return new Promise((resolve, reject) => {
    cy.request(options).then((response) => {
      try {
        resolve({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          json: () => response.body,
          status: response.status,
          headers: {
            entries: Object.entries(response.headers).map(([key, value]) => [
              key,
              Array.isArray(value) ? (value[0] ?? '') : value,
            ]),
            getSetCookie: () => extractSetCookie(response.headers['set-cookie']),
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};

function extractSetCookie(value: undefined | string | string[]) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}
