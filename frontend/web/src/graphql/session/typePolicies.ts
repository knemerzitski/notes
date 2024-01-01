import { TypePolicies } from '@apollo/client';

const typePolicies: TypePolicies = {
  RemoteSession: {
    keyFields: ['cookieIndex'],
  },
};

export default typePolicies;
