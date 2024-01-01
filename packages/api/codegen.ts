import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/**/schema.graphql',
  generates: {
    './src/graphql': defineConfig({
      // add: {
      //   './types.generated.ts': { content: '/* eslint-disable */' },
      // },
      typesPluginsConfig: {
        noSchemaStitching: false,
        contextType: './context#GraphQLResolversContext',
      },
    }),
  },
  ignoreNoDocuments: true,
};

export default config;
