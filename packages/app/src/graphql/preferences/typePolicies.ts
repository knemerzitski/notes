import { TypePolicies } from '@apollo/client';
import { GraphQLError } from 'graphql';

import {
  Preferences,
  UpdatePreferencesPatchInput,
  UpdatePreferencesPayload,
} from '../__generated__/graphql';

import { readPreferences, savePreferences } from './persistence';

const typePolicies: TypePolicies = {
  Query: {
    fields: {
      preferences: {
        read(): Preferences {
          return readPreferences();
        },
      },
    },
  },
  Mutation: {
    fields: {
      updatePreferences: {
        read(
          _,
          { variables }: { variables?: { input?: UpdatePreferencesPatchInput } }
        ): UpdatePreferencesPayload {
          if (!variables?.input?.patch) {
            throw new GraphQLError('Missing input');
          }

          const preferences = readPreferences();
          const preferencesPatch = variables.input.patch;

          if (preferencesPatch.colorMode) {
            preferences.colorMode = preferencesPatch.colorMode;
          }

          savePreferences(preferences);

          return {
            preferences,
          };
        },
      },
    },
  },
};

export default typePolicies;
