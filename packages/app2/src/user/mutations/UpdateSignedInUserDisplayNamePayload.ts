import { mutationDefinition } from '../../graphql/utils/mutation-definition';
import { gql } from '../../__generated__';

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
