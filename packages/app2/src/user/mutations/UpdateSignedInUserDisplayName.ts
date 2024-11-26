import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const UpdateSignedInUserDisplayName = mutationDefinition(
  gql(`
    mutation UpdateSignedInUserDisplayName($input: UpdateSignedInUserDisplayNameInput!) @persist  {
      updateSignedInUserDisplayName(input: $input) {
        ...UpdateSignedInUserDisplayNamePayload
      }
    }
  `)
);
