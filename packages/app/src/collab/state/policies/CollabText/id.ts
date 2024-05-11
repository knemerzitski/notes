import { FieldPolicy } from '@apollo/client';
import { CollabText } from '../../../../__generated__/graphql';
import { activeCollabTextsVar } from '../../reactive-vars';

export const id: FieldPolicy<CollabText['id'], CollabText['id']> = {
  read(id, { toReference }) {
    const collabTextRef = toReference({
      id,
      __typename: 'CollabText',
    });
    if (!collabTextRef) return id;

    const activeCollabTexts = activeCollabTextsVar();
    if (!(collabTextRef.__ref in activeCollabTexts)) {
      activeCollabTextsVar({
        ...activeCollabTexts,
        [collabTextRef.__ref]: collabTextRef,
      });
    }

    return id;
  },
};
