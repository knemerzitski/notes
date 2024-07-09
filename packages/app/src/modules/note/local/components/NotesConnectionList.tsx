import { Button } from '@mui/material';

import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../../router/context/ProxyRoutesProvider';
import { useAbsoluteLocation } from '../../../router/hooks/useAbsoluteLocation';
import { NoteCardItemProps } from '../../base/components/NoteCardItem';
import NotesCardList from '../../base/components/NotesCardList';
import useDeleteLocalNote from '../hooks/useDeleteLocalNote';
import useLocalNotesConnection, {
  UseLocalNotesConnectionOptions,
} from '../hooks/useLocalNotesConnection';

interface NotesConnectionListProps {
  notesConnectionOptions?: UseLocalNotesConnectionOptions;
}

export default function NotesConnectionList({
  notesConnectionOptions,
}: NotesConnectionListProps) {
  const { data, fetchMore, canFetchMore } =
    useLocalNotesConnection(notesConnectionOptions);

  const deleteNote = useDeleteLocalNote();

  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const notes: NoteCardItemProps['note'][] = data.notes.map(({ id, textFields }) => ({
    id: String(id),
    title: textFields.TITLE.viewText,
    content: textFields.CONTENT.viewText,
    editing: absoluteLocation.pathname === transform(`/local/note/${id}`),
  }));

  function handleStartEdit(noteId: string) {
    navigate(`/local/note/${noteId}`);
  }

  function handleDelete(id: string) {
    deleteNote(id);
  }

  return (
    <>
      <NotesCardList
        {...{ notes, onStartEdit: handleStartEdit, onDelete: handleDelete }}
      />
      {canFetchMore && <Button onClick={() => void fetchMore()}>Fetch More</Button>}
    </>
  );
}
