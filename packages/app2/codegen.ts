import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/graphql/domains/*/schema.graphql',
  documents: ['./src/**/!(*.test).{ts,tsx}'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      schema: './src/**/schema.graphql',
      presetConfig: {
        gqlTagName: 'gql',
      },
      config: {
        scalars: {
          ID: { input: 'string', output: 'string | number' },
          Date: {
            input: 'Date',
            output: 'Date | string',
          },
          HexColorCode: 'string',
          NonNegativeInt: 'number',
          PositiveInt: 'number',
          Changeset: 'unknown',
          Cursor: 'string | number',
          ObjectID: 'string',
        },
        enumsAsTypes: false,
        namingConvention: {
          typeNames: 'change-case-all#pascalCase',
          enumValues: 'change-case-all#upperCase',
        },
      },
    },
  },
  ignoreNoDocuments: true,
  hooks: {
    afterAllFileWrite: ['eslint --fix', 'prettier --write --ignore-unkown'],
  },
};

// eslint-disable-next-line import/no-default-export
export default config;
