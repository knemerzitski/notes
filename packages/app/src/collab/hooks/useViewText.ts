import { gql } from '../../__generated__';
import { useFragment } from '@apollo/client';

const FRAGMENT = gql(`
  fragment UseViewText on CollabText {
    viewText
  }
`);

export default function useViewText(collabTextId: string) {
  const collabText = useFragment({
    from: {
      id: collabTextId,
      __typename: 'CollabText',
    },
    fragment: FRAGMENT,
  });

  return collabText.data.viewText ?? '';
}
