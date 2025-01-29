import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  PublicUserProfile,
  UpdateSignedInUserDisplayNamePayloadFragmentDoc,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { userSerializationKey_fieldDisplayName } from '../../graphql/utils/serialization-key';
import { UpdateSignedInUserDisplayName } from '../mutations/UpdateSignedInUserDisplayName';
import { useUserId } from '../context/user-id';

export function useUpdateDisplayNameMutation() {
  const userId = useUserId();
  const [updateDisplayNameMutation] = useMutation(UpdateSignedInUserDisplayName);

  return useCallback(
    (displayName: PublicUserProfile['displayName']) => {
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
                  __typename: 'SignedInUser',
                  id: userId,
                  public: {
                    id: userId,
                    __typename: 'PublicUser',
                    profile: {
                      __typename: 'PublicUserProfile',
                      displayName,
                    },
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
