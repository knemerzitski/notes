import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/schema/**/schema.graphql',
  generates: {
    './src/schema': defineConfig({
      // add: {
      //   './types.generated.ts': { content: '/* eslint-disable */' },
      // },
      typesPluginsConfig: {
        contextType: './context#GraphQLResolversContext',
      },
    }),
  },
  ignoreNoDocuments: true,
};

export default config;
