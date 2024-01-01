import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../backend/api/src/graphql/**/schema.graphql',
  documents: ['./src/**/*.{ts,tsx}'],
  generates: {
    './src/graphql/__generated__/': {
      preset: 'client',
      schema: './src/graphql/**/schema.graphql',
      presetConfig: {
        gqlTagName: 'gql',
      },
      // TODO encode documents to prevent any query execution...
    },
  },
  ignoreNoDocuments: true,
};

export default config;
