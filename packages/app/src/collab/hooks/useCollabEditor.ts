import { ApolloClient, useFragment } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import { getEditorContext, getEditorContextMaybe } from '../state/editors-context';
import { CollabEditor } from '~collab/client/collab-editor';

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

  return getEditorContext(collabTextId, () =>
    collabText.complete ? collabText.data.headText : undefined
  ).editor;
}

export function getCollabEditor<TCacheShape>(
  apolloClient: ApolloClient<TCacheShape>,
  collabTextId: string
): CollabEditor {
  return getEditorContext(collabTextId, () => {
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
  return getEditorContextMaybe(collabTextId, () => {
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
