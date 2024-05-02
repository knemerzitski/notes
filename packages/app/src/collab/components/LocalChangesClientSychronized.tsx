import LocalChangesWatcher, {
  LocalChangesWatcherProps,
} from './watch/LocalChangesWatcher';
import { useUpdateClientSyncStatus } from '../../context/ClientSyncStatusProvider';

interface LocalChangesClientSychronizedProps {
  collabTextId: string;
}

/**
 * Displays loading indicator while CollabText has local changes.
 */
export default function LocalChangesClientSychronized({
  collabTextId,
}: LocalChangesClientSychronizedProps) {
  const updateClientSynchronized = useUpdateClientSyncStatus();

  const handleLocalChanges: LocalChangesWatcherProps['onNext'] = (value) => {
    const haveLocalChanges = value.data.localChanges != null;
    updateClientSynchronized(collabTextId, !haveLocalChanges);
  };

  return <LocalChangesWatcher collabTextId={collabTextId} onNext={handleLocalChanges} />;
}
