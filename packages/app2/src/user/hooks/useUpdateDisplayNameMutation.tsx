import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import {
  PublicUserProfile,
  UpdateSignedInUserDisplayNamePayloadFragmentDoc,
} from '../../__generated__/graphql';
import { getCurrentUserId } from '../models/signed-in-user/get-current';
import { UpdateSignedInUserDisplayName } from '../mutations/UpdateSignedInUserDisplayName';
import { makeFragmentData } from '../../__generated__';
import { useMutation } from '../../graphql/hooks/useMutation';

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
