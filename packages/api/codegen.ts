import { defineConfig } from '@eddeee888/gcg-typescript-resolver-files';
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/**/schema.graphql',
  generates: {
    './src/graphql': defineConfig({
      add: {
        './types.generated.ts': {
          content: "import { MaybeValue } from '~utils/types';",
        },
      },
      scalarsOverrides: {
        ObjectID: {
          resolver: 'base/resolvers/ObjectID#ObjectID',
          type: 'mongodb#ObjectId',
        },
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
         * For TypeScript, make all resolvers nullable and let
         * GraphQL throw "null on a non-nullable field error" and not
         * check value indivudually on each resolver.
         *
         * Any value that is function or promise gets called or resolved when GraphQL executes.
         * This allows flexible typing.
         */
        customResolverFn:
          '(parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => MaybeValue<TResult>',
        resolverTypeWrapperSignature: 'MaybeValue<T>',
        wrapFieldDefinitions: true,
        wrapEntireFieldDefinitions: true,
        fieldWrapperValue: 'MaybeValue<T>',
      },
    }),
  },
  ignoreNoDocuments: true,
  hooks: {
    afterAllFileWrite: ['prettier --write --ignore-unkown'],
  },
};

// eslint-disable-next-line import/no-default-export
export default config;
