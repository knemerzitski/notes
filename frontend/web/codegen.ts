import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../../backend/api/src/schema/**/schema.graphql',
  documents: ['./src/**/*.{ts,tsx}'],
  generates: {
    './src/schema/__generated__/': {
      preset: 'client',
      schema: './src/schema/**/schema.graphql',
      presetConfig: {
        gqlTagName: 'gql',
      },
      // TODO encode documents to prevent any query execution...
    },
  },
  ignoreNoDocuments: true,
};

export default config;
