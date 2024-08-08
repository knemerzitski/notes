import { FieldPolicy, TypePolicies } from '@apollo/client';

import { ColorMode, Query } from '../../__generated__/graphql';

const Query_preferences: FieldPolicy<Query['preferences'], Query['preferences']> = {
  read(
    existing = {
      colorMode: ColorMode.SYSTEM,
    }
  ) {
    return existing;
  },
};

export const preferencesPolicies: TypePolicies = {
  Query: {
    fields: {
      preferences: Query_preferences,
    },
  },
};
