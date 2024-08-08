import { Alert, Button } from '@mui/material';
import { ReactNode, startTransition } from 'react';

import {
  useProxyNavigate,
  useProxyRouteTransform,
} from '../../../router/context/proxy-routes-provider';
import { useAbsoluteLocation } from '../../../router/hooks/use-absolute-location';
import { NoteCardItemProps } from '../../base/components/note-card-item';
import { NotesCardList } from '../../base/components/notes-card-list';
import { NoteContentIdProvider } from '../context/note-content-id-provider';
import { useDeleteNote } from '../hooks/use-delete-note';
import {
  UseNotesConnectionOptions,
  useNotesConnection,
} from '../hooks/use-notes-connection';

import { NoteToolbar } from './note-toolbar';

interface NotesConnectionListProps {
  notesConnectionOptions?: UseNotesConnectionOptions;
  /**
   * Render this node when list is empty
   */
  emptyRender?: ReactNode;
}

export function NotesConnectionList({
  notesConnectionOptions,
  emptyRender,
}: NotesConnectionListProps) {
  const { data, loading, error, fetchMore, canFetchMore } =
    useNotesConnection(notesConnectionOptions);

  const deleteNote = useDeleteNote();
  const navigate = useProxyNavigate();
  const transform = useProxyRouteTransform();
  const absoluteLocation = useAbsoluteLocation();

  if (error) {
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  const notes: NoteCardItemProps['note'][] =
    data?.notes.map(({ contentId, textFields, isOwner, sharing }) => ({
      id: contentId,
      title: textFields.TITLE.viewText,
      content: textFields.CONTENT.viewText,
      // TODO for editing compare pathname make a hook and do it in note?
      editing: absoluteLocation.pathname === transform(`/note/${contentId}`),
      type: !isOwner ? 'linked' : sharing ? 'shared' : undefined,
      slots: {
        toolbar: (
          <NoteContentIdProvider noteContentId={contentId}>
            <NoteToolbar
              generic={{
                start: {
                  edge: 'start',
                },
              }}
              hasEditor={false}
            />
          </NoteContentIdProvider>
        ),
      },
    })) ?? [];

  if (notes.length === 0 && emptyRender) {
    return emptyRender;
  }

  function handleStartEdit(noteId: string) {
    startTransition(() => {
      navigate(`/note/${noteId}`);
    });
  }

  function handleDelete(id: string) {
    void deleteNote(id);
  }

  return (
    <>
      <NotesCardList
        loading={loading}
        notes={notes}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
      />
      {/* // TODO implement infinite loading with a limit? */}
      {canFetchMore && <Button onClick={() => void fetchMore()}>Fetch More</Button>}
    </>
  );
}
