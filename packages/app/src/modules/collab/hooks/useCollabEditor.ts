import { ApolloClient, useFragment } from '@apollo/client';
import { CollabEditor } from '~collab/client/collab-editor';
import { RevisionChangeset } from '~collab/records/record';

import { gql } from '../../../__generated__/gql';
import { editorsInCache } from '../../editor/editors';

export const FRAGMENT = gql(`
  fragment UseCollabEditor on CollabText {
    headText {
      revision
      changeset
    }
  }
`);

function getCacheId(collabTextId: string) {
  return {
    __typename: 'CollabText',
    id: collabTextId,
  };
}

export default function useCollabEditor(collabTextId: string): CollabEditor {
  const collabText = useFragment({
    from: {
      id: collabTextId,
      __typename: 'CollabText',
    },
    fragment: FRAGMENT,
  });

  return editorsInCache.getOrCreate(getCacheId(collabTextId), () => {
    return CollabEditor.headTextAsOptions(
      RevisionChangeset.parseValue(collabText.data.headText)
    );
  }).editor;
}

export function getCollabEditor<TCacheShape>(
  apolloClient: ApolloClient<TCacheShape>,
  collabTextId: string
): CollabEditor {
  return editorsInCache.getOrCreate(getCacheId(collabTextId), () => {
    const collabText = apolloClient.cache.readFragment({
      id: apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }),
      fragment: FRAGMENT,
    });
    return CollabEditor.headTextAsOptions(
      RevisionChangeset.parseValue(collabText?.headText)
    );
  }).editor;
}

export function getCollabEditorMaybe<TCacheShape>(
  apolloClient: ApolloClient<TCacheShape>,
  collabTextId: string
): CollabEditor | undefined {
  return editorsInCache.getOrCreateMaybe(getCacheId(collabTextId), () => {
    const collabText = apolloClient.cache.readFragment({
      id: apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }),
      fragment: FRAGMENT,
    });
    return CollabEditor.headTextAsOptions(
      RevisionChangeset.parseValue(collabText?.headText)
    );
  })?.editor;
}
