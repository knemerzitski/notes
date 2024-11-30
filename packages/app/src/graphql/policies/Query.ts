import { CreateTypePolicyFn } from '../types';
import { fieldArrayToMap } from '../utils/field-array-to-map';

export const Query: CreateTypePolicyFn = function () {
  return {
    fields: {
      ongoingOperation(_existing, { args, toReference }) {
        return toReference({
          __typename: 'ApolloOperation',
          id: args?.id,
        });
      },
      ongoingOperations: fieldArrayToMap('id'),
    },
  };
};
