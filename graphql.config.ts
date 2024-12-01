import type { IGraphQLConfig } from 'graphql-config';

const config: IGraphQLConfig = {
  schema: [
    './packages/api/src/graphql/domains/*/schema.graphql',
    './packages/app/src/*/schema.graphql',
  ],
  documents: './packages/app/src/**/!(*.test|*.cy).ts?(x)',
  extensions: {
    languageService: {
      // Use eslint for linting instead of VScode GraphQL Plugin
      // Allows for more customization. E.g. exclude tests files
      enableValidation: false,
    },
  },
};

export default config;
