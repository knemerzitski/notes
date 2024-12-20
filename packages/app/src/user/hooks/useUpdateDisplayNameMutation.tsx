import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  PublicUserProfile,
  UpdateSignedInUserDisplayNamePayloadFragmentDoc,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { userSerializationKey_fieldDisplayName } from '../../graphql/utils/serialization-key';
import { getCurrentUserId } from '../models/signed-in-user/get-current';
import { UpdateSignedInUserDisplayName } from '../mutations/UpdateSignedInUserDisplayName';

export function useUpdateDisplayNameMutation() {
  const client = useApolloClient();
  const [updateDisplayNameMutation] = useMutation(UpdateSignedInUserDisplayName);

  return useCallback(
    (displayName: PublicUserProfile['displayName']) => {
      const userId = getCurrentUserId(client.cache);
      if (!userId) {
        throw new Error('Cannot update displayName without current userId');
      }

      return updateDisplayNameMutation({
        variables: {
          input: {
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
    [updateDisplayNameMutation, client]
  );
}
