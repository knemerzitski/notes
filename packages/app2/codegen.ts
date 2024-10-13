import { CodegenConfig } from '@graphql-codegen/cli';
import { ClientPresetConfig } from '@graphql-codegen/client-preset';

const config: CodegenConfig = {
  schema: '../api/src/graphql/domains/*/schema.graphql',
  documents: ['./src/**/!(*.(test|cy)).{ts,tsx}'],
  generates: {
    './src/__generated__/': {
      preset: 'client',
      schema: './src/**/schema.graphql',
      presetConfig: {
        gqlTagName: 'gql',
        fragmentMasking: { unmaskFunctionName: 'getFragmentData' },
      } satisfies ClientPresetConfig,
      config: {
        scalars: {
          ID: { input: 'string', output: 'string' },
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
        nonOptionalTypename: true,
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
