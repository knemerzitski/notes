import { Button } from '@mui/material';

import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../../router/context/proxy-routes-provider';
import { useAbsoluteLocation } from '../../../router/hooks/use-absolute-location';
import { NoteCardItemProps } from '../../base/components/note-card-item';
import { NotesCardList } from '../../base/components/notes-card-list';
import { useDeleteNote } from '../hooks/use-delete-note';
import {
  UseNotesConnectionOptions, useNotesConnection
} from '../hooks/use-notes-connection';

import { NoteToolbar } from './note-toolbar';

interface NotesConnectionListProps {
  notesConnectionOptions?: UseNotesConnectionOptions;
}

export function NotesConnectionList({
  notesConnectionOptions,
}: NotesConnectionListProps) {
  const { data, fetchMore, canFetchMore } = useNotesConnection(notesConnectionOptions);

  const deleteNote = useDeleteNote();

  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  const notes: NoteCardItemProps['note'][] = data.notes.map(({ id, textFields }) => ({
    id: String(id),
    title: textFields.TITLE.viewText,
    content: textFields.CONTENT.viewText,
    editing: absoluteLocation.pathname === transform(`/local/note/${id}`),
    slots: {
      toolbar: <NoteToolbar hasEditor={false} />,
    },
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
