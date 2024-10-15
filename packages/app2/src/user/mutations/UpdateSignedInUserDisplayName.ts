import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const UpdateSignedInUserDisplayName = mutationDefinition(
  gql(`
    mutation UpdateSignedInUserDisplayName($input: UpdateSignedInUserDisplayNameInput!) @persist @serialize(key: ["displayName"])  {
      updateSignedInUserDisplayName(input: $input) {
        ...UpdateSignedInUserDisplayNamePayload
      }
    }
  `)
);
