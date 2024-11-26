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
          DateTime: 'Date',
          HexColorCode: 'string',
          NonNegativeInt: 'number',
          PositiveInt: 'number',
          Changeset: '~collab/changeset#Changeset',
          Cursor: 'string | number',
          ObjectID: 'string',
          UserNoteLinkID: 'string',
          CollabService: '~collab/client/collab-service#CollabService',
          NoteTextFieldEditor: '../note/external-state/note#NoteTextFieldEditor',
          SerializeKey: 'string | number | boolean',
        },
        // TODO use enumValues for NoteTextFieldName
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
