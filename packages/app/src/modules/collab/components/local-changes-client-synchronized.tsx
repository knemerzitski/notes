import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';

import { CollabEditor } from '~collab/client/collab-editor';

import { useUpdateClientSynchronization } from '../../global/hooks/use-update-client-synchronized';
import { useCollabEditor } from '../hooks/use-collab-editor';

interface LocalChangesClientSychronizedProps {
  collabTextId: string;
}

function isEditorSynchronized(editor: CollabEditor) {
  return !editor.haveSubmittedChanges() && !editor.haveLocalChanges();
}

/**
 * Displays loading indicator while CollabText has local changes.
 */
export function LocalChangesClientSychronized({
  collabTextId,
}: LocalChangesClientSychronizedProps) {
  const updateClientSynchronization = useUpdateClientSynchronization();
  const apolloClient = useApolloClient();
  const editor = useCollabEditor(collabTextId);

  useEffect(() => {
    const syncId =
      apolloClient.cache.identify({
        id: collabTextId,
        __typename: 'CollabText',
      }) ?? `CollabText:${collabTextId}`;

    function update() {
      updateClientSynchronization(syncId, isEditorSynchronized(editor));
    }

    const unsubscribe = editor.eventBus.onMany(
      ['haveLocalChanges', 'submittedChangesAcknowledged', 'replacedHeadText'],
      update
    );

    return () => {
      updateClientSynchronization(syncId, true);
      unsubscribe();
    };
  }, [apolloClient, collabTextId, updateClientSynchronization, editor]);

  return null;
}
