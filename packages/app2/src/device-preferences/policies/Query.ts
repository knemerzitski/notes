import { CreateTypePolicyFn } from '../../graphql/types';

export const Query: CreateTypePolicyFn = function () {
  return {
    fields: {
      devicePreferences(_existing) {
        return {
          __typename: 'DevicePreferences',
        };
      },
    },
  };
};
