import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/**/schema.graphql',
  documents: ['./src/**/*.{ts,tsx}'],
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
          Changeset: '~collab/changeset/changeset#SerializedChangeset',
          Cursor: 'string | number',
        },
      },
      // TODO encode documents to prevent any query execution?
    },
  },
  ignoreNoDocuments: true,
  hooks: {
    afterAllFileWrite: ['eslint --fix', 'prettier --write --ignore-unkown'],
  },
};

export default config;
