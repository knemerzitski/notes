/**
 * Between tests same cache might be overwritten by previous test since each
 * tests uses same localStorage. It is most likely to happen when tests are fast (headless and built app).
 * This logic ensures that for each test separate storageKey is used.
 *
 * This is due to app persisting cache using a timeout/debounce/delay as not to write to storage on every single cache change.
 * That timeout can happent between tests after storage has been cleared by Cypress. In that case next test starts with invalid cache.
 */

import { createGraphQLService } from '../../../../src/graphql/create/service';

type Options = Parameters<typeof createGraphQLService>[0];

declare global {
  // eslint-disable-next-line no-var
  var appEnvironment:
    | {
        overrideDefaultGraphQLServiceParams?: Partial<Omit<Options, 'storage'>> & {
          storage?: Partial<Options['storage']>;
        };
      }
    | undefined;
}

const appEnvironment: typeof window.appEnvironment = {};

Cypress.on('window:before:load', (win) => {
  win.appEnvironment = appEnvironment;
});

let nextStorageKeyCounter = 0;

beforeEach(() => {
  appEnvironment.overrideDefaultGraphQLServiceParams = {
    storage: {
      preferredType: 'localStorage',
      keyPrefix: `test:${nextStorageKeyCounter++}:`,
    },
  };
  window.appEnvironment = appEnvironment;
});

afterEach(() => {
  appEnvironment.overrideDefaultGraphQLServiceParams = {};
});
