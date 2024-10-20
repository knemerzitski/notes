import { TypePolicies } from '@apollo/client';

import { clientSynchronizationVar } from './reactive-vars';

export const basePolicies: TypePolicies = {
  Query: {
    fields: {
      isClientSynchronized(): boolean {
        return clientSynchronizationVar().size === 0;
      },
    },
  },
};
