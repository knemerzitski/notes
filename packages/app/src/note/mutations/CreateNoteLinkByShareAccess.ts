import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const CreateNoteLinkByShareAccess = mutationDefinition(
  gql(`
  mutation CreateNoteLinkByShareAccess($input: CreateNoteLinkByShareAccessInput!) @persist {
    createNoteLinkByShareAccess(input:  $input) {
      ...CreateNoteLinkByShareAccessPayload
    }
  }
`),
  () => {
    // do nothing
  }
);
