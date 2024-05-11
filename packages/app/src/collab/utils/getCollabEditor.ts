import { ApolloClient } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import { CollabEditor } from '~collab/client/collab-editor';
import { getEditorContext } from '../state/editors-context';

export const FRAGMENT = gql(`
  fragment GetCollabEditor on CollabText {
    headText {
      revision
      changeset
    }
  }
`);

export default function getCollabEditor<TCacheShape>(
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
