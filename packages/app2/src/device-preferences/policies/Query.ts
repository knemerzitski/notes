import { CreateTypePolicyFn } from '../../graphql/types';

export const Query: CreateTypePolicyFn = function () {
  return {
    fields: {
      devicePreferences(
        existing = {
          __typename: 'DevicePreferences',
        }
      ) {
        return existing;
      },
    },
  };
};
