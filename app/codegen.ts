import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // schema: './src/schema/typedefs.graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      schema: './src/graphql/typeDefs.graphql',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
