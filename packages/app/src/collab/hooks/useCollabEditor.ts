import { ApolloClient, useFragment } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import { CollabEditor } from '~collab/client/collab-editor';
import { editorsWithVars } from '../state/editors-by-id';

export const FRAGMENT = gql(`
  fragment UseCollabEditor on CollabText {
    headText {
      revision
      changeset
    }
  }
`);

export default function useCollabEditor(collabTextId: string): CollabEditor {
  const collabText = useFragment({
    from: {
      id: collabTextId,
      __typename: 'CollabText',
    },
    fragment: FRAGMENT,
  });

  return editorsWithVars.getOrCreateOrFail(collabTextId, () =>
    collabText.complete ? collabText.data.headText : undefined
  ).editor;
}

export function getCollabEditor<TCacheShape>(
  apolloClient: ApolloClient<TCacheShape>,
  collabTextId: string
): CollabEditor {
  return editorsWithVars.getOrCreateOrFail(collabTextId, () => {
    const collabText = apolloClient.cache.readFragment({
      id: apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }),
      fragment: FRAGMENT,
    });
    return collabText?.headText;
  }).editor;
}

export function getCollabEditorMaybe<TCacheShape>(
  apolloClient: ApolloClient<TCacheShape>,
  collabTextId: string
): CollabEditor | undefined {
  return editorsWithVars.getOrCreate(collabTextId, () => {
    const collabText = apolloClient.cache.readFragment({
      id: apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }),
      fragment: FRAGMENT,
    });
    return collabText?.headText;
  })?.editor;
}
