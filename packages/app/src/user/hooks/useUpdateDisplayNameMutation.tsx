import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  UserProfile,
  UpdateSignedInUserDisplayNamePayloadFragmentDoc,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { userSerializationKey_fieldDisplayName } from '../../graphql/utils/serialization-key';
import { useUserId } from '../context/user-id';
import { UpdateSignedInUserDisplayName } from '../mutations/UpdateSignedInUserDisplayName';

export function useUpdateDisplayNameMutation() {
  const userId = useUserId();
  const [updateDisplayNameMutation] = useMutation(UpdateSignedInUserDisplayName);

  return useCallback(
    (displayName: UserProfile['displayName']) => {
      return updateDisplayNameMutation({
        variables: {
          input: {
            authUser: {
              id: userId,
            },
            displayName,
          },
        },
        context: {
          serializationKey: userSerializationKey_fieldDisplayName(userId),
        },
        optimisticResponse: {
          __typename: 'Mutation',
          updateSignedInUserDisplayName: {
            __typename: 'UpdateSignedInUserDisplayNamePayload',
            ...makeFragmentData(
              {
                __typename: 'UpdateSignedInUserDisplayNamePayload',
                signedInUser: {
                  __typename: 'User',
                  id: userId,
                  profile: {
                    __typename: 'UserProfile',
                    displayName,
                  },
                },
              },
              UpdateSignedInUserDisplayNamePayloadFragmentDoc
            ),
          },
        },
      });
    },
    [updateDisplayNameMutation, userId]
  );
}
