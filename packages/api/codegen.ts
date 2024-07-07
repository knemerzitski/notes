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
        Cursor: {
          type: 'string | number',
        },
      },
      typesPluginsConfig: {
        noSchemaStitching: false,
        contextType: './context#GraphQLResolversContext',
        enumsAsTypes: false,
        /**
         * Any data fetched from MongoDB is potentially undefined.
         * Allow GraphQL itself to throw error if resolver returns
         * null on a non-nullable field. Otherwise would have to
         * check for null on each individual field.
         */
        resolverTypeWrapperSignature:
          'Promise<T | null | undefined> | T | null | undefined',
      },
    }),
  },
  ignoreNoDocuments: true,
  hooks: {
    afterAllFileWrite: ['eslint --fix', 'prettier --write --ignore-unkown'],
  },
};

export default config;
