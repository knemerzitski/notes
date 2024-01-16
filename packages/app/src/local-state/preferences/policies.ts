import { TypePolicies } from '@apollo/client';

import { Preferences } from '../../__generated__/graphql';

import { colorModeVar } from './state';

const preferencesPolicies: TypePolicies = {
  Query: {
    fields: {
      preferences(): Preferences {
        return {
          colorMode: colorModeVar(),
        };
      },
    },
  },
};

export default preferencesPolicies;
