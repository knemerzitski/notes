import { useSuspenseQuery } from '@apollo/client';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { gql } from '../../../__generated__/gql';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import EditNoteDialog from '../../../components/notes/edit/EditNoteDialog';
import { NoteEditorProps } from '../../../components/notes/edit/NoteEditor';
import useDeleteNote from '../../../graphql/note/hooks/useDeleteNote';
import useUpdateNote from '../../../graphql/note/hooks/useUpdateNote';

const QUERY = gql(`
  query EditNoteDialogRoute($id: ID!) {
    note(id: $id) {
      id
      title
      textContent
    }
  }
`);

// const SUBSCRIPTION_UPDATED = gql(`
//   subscription NotesRouteNoteUpdated {
//     noteUpdated {
//       id
//       patch {
//         title
//         textContent
//       }
//     }
//   }
// `);

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const params = useParams<'id'>();

  const { data, client } = useSuspenseQuery(QUERY, {
    variables: {
      id: params.id ?? '',
    },
  });

  const noteId = String(data.note.id);

  const [note, setNote] = useState<NoteEditorProps['note']>({
    title: data.note.title,
    content: data.note.textContent,
  });

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  // TODO fix: subscription overwrites current changes
  // useEffect(() => {
  //   subscribeToMore({
  //     document: SUBSCRIPTION_UPDATED,
  //     updateQuery(existing, { subscriptionData }) {
  //       const existingNote = existing.note;
  //       const noteUpdate = subscriptionData.data.noteUpdated;

  //       const updatedNote = {
  //         ...existingNote,
  //         title: noteUpdate.patch.title ?? existingNote.title,
  //         textContent: noteUpdate.patch.textContent ?? existingNote.textContent,
  //       };
  //       setNote({
  //         title: noteUpdate.patch.title ?? note.title,
  //         content: noteUpdate.patch.textContent ?? note.content,
  //       });

  //       return {
  //         note: updatedNote,
  //       };
  //     },
  //   });
  // }, [subscribeToMore, setNote, note]);

  const handleChangedNote: NoteEditorProps['onChange'] = async ({ title, content }) => {
    setNote({
      title,
      content,
    });
    await updateNote({
      id: noteId,
      title,
      textContent: content,
    });
  };

  function handleDeleteNote() {
    return deleteNote(noteId);
  }

  function handleClosed() {
    client.cache.writeFragment({
      id: client.cache.identify({ id: noteId, __typename: 'Note' }),
      fragment: gql(`
        fragment EditNoteDialogRouteUpdateNote on Note {
          title
          textContent
        }
      `),
      data: {
        title: note.title,
        textContent: note.content,
      },
    });
    onClosed();
  }

  return (
    <EditNoteDialog
      slotProps={{
        dialog: {
          open,
          onClose: onClosing,
          onTransitionExited: handleClosed,
        },
        editor: {
          onClose: onClosing,
          note,
          onChange: handleChangedNote,
          onDelete: handleDeleteNote,
        },
      }}
    />
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
