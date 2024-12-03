import { CreateTypePolicyFn } from '../../graphql/types';

export const Query: CreateTypePolicyFn = function () {
  return {
    fields: {
      devicePreferences(
        existing = {
          __typename: 'DevicePreferences',
        }
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return existing;
      },
    },
  };
};
