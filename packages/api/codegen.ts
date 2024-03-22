import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/**/schema.graphql',
  generates: {
    './src/graphql': defineConfig({
      // add: {
      //   './types.generated.ts': { content: '/* eslint-disable */' },
      // },
      scalarsOverrides: {
        Changeset: {
          type: '~collab/changeset/changeset#Changeset',
        },
      },
      typesPluginsConfig: {
        noSchemaStitching: false,
        contextType: './context#GraphQLResolversContext',
        enumsAsTypes: false,
      },
    }),
  },
  ignoreNoDocuments: true,
};

export default config;
