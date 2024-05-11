import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';
import useUpdateClientSynchronization from '../../local-state/base/hooks/useUpdateClientSynchronized';
import useCollabEditor from '../hooks/useCollabEditor';
import { CollabEditor } from '~collab/client/collab-editor';

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

    const subs = [
      editor.eventBus.on('haveLocalChanges', update),
      editor.eventBus.on('submittedChangesAcknowledged', update),
    ];

    return () => {
      subs.forEach((unsub) => {
        unsub();
      });
    };
  }, [apolloClient, collabTextId, updateClientSynchronization]);

  return null;
}
