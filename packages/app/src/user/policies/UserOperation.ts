import { CreateTypePolicyFn } from '../../graphql/types';

export const UserOperation: CreateTypePolicyFn = function () {
  return {
    keyFields: false,
  };
};
