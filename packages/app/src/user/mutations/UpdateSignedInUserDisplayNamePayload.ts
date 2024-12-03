import { gql } from '../../__generated__';
import { mutationDefinition } from '../../graphql/utils/mutation-definition';

export const UpdateSignedInUserDisplayNamePayload = mutationDefinition(
  gql(`
    fragment UpdateSignedInUserDisplayNamePayload on UpdateSignedInUserDisplayNamePayload {
      signedInUser {
        id
        public {
          id
          profile {
            displayName
          }
        }
      }
    }  
  `)
);
