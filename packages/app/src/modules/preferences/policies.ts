import { FieldPolicy, TypePolicies } from '@apollo/client';

import { ColorMode, Query } from '../../__generated__/graphql';

const Query_preferences: FieldPolicy<Query['preferences'], Query['preferences']> = {
  read(
    existing = {
      colorMode: ColorMode.System,
    }
  ) {
    return existing;
  },
};

const preferencesPolicies: TypePolicies = {
  Query: {
    fields: {
      preferences: Query_preferences,
    },
  },
};

export default preferencesPolicies;
