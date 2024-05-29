import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';
import useCollabEditor from '../hooks/useCollabEditor';
import { CollabEditor } from '~collab/client/collab-editor';
import useUpdateClientSynchronization from '../../global/hooks/useUpdateClientSynchronized';

interface LocalChangesClientSychronizedProps {
  collabTextId: string;
}

function isEditorSynchronized(editor: CollabEditor) {
  return !editor.haveSubmittedChanges() && !editor.haveLocalChanges();
}

/**
 * Displays loading indicator while CollabText has local changes.
 */
export default function LocalChangesClientSychronized({
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

    return editor.eventBus.onMany(
      ['haveLocalChanges', 'submittedChangesAcknowledged'],
      update
    );
  }, [apolloClient, collabTextId, updateClientSynchronization, editor]);

  return null;
}
