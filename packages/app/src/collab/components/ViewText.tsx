import { gql } from '../../__generated__';
import { useFragment } from '@apollo/client';

const FRAGMENT = gql(`
  fragment ViewText on CollabText {
    viewText
  }
`);

export interface ViewTextProps {
  collabTextId: string;
}

export default function ViewText({ collabTextId }: ViewTextProps) {
  const collabText = useFragment({
    from: {
      id: collabTextId,
      __typename: 'CollabText',
    },
    fragment: FRAGMENT,
  });

  return collabText.data.viewText ?? '';
}
