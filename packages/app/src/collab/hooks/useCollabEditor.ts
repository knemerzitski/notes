import { useFragment } from '@apollo/client';
import { gql } from '../../__generated__/gql';
import { getEditorContext } from '../state/editors-context';
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
