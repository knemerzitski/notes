/**
 * Fetch using `cy.request` that is compatible with `typeof fetch`
 */
export const cyFetch: typeof fetch = function (input, init) {
  if (typeof input !== 'string') {
    throw new Error('Not implemented');
  }

  return new Promise((resolve, reject) => {
    cy.request({
      url: input,
      ...init,
    }).then((res) => {
      try {
        const headers = new Headers();
        Object.entries(res.headers).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => {
              headers.set(key, v);
            });
          } else {
            headers.set(key, value);
          }
        });

        resolve(
          new Response(
            new Blob([JSON.stringify(res.body)], {
              type: 'application/json',
            }),
            {
              status: res.status,
              statusText: res.statusText,
              headers,
            }
          )
        );
      } catch (err) {
        reject(err);
      }
    });
  });
};
