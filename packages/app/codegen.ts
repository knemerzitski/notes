import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/graphql/**/schema.graphql',
  documents: ['./src/**/*.{ts,tsx}'],
  generates: {
    './src/local-state/__generated__/': {
      preset: 'client',
      schema: './src/local-state/**/schema.graphql',
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        scalars: {
          ID: {
            input: 'string',
            output: 'string | number',
          },
          Date: {
            input: 'Date',
            output: 'Date | string',
          },
          HexColorCode: {
            input: 'string',
            output: 'string',
          },
          NonNegativeInt: {
            input: 'number',
            output: 'number',
          },
          PositiveInt: {
            input: 'number',
            output: 'number',
          },
        },
      },
      // TODO encode documents to prevent any query execution...
    },
  },
  ignoreNoDocuments: true,
};

export default config;
