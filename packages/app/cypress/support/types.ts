import { defineConfig } from 'cypress';

export type Unchainable<T> = T extends Cypress.Chainable<infer U> ? U : never;

export type SetupNodeEventsFn = NonNullable<
  Parameters<typeof defineConfig>[0]['setupNodeEvents']
>;
