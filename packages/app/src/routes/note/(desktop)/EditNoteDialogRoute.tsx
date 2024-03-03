import { useSuspenseQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Changeset } from '~collab/changeset/changeset';

import { gql } from '../../../__generated__/gql';
import RouteClosable, {
  RouteClosableComponentProps,
} from '../../../components/feedback/RouteClosable';
import { useSnackbarError } from '../../../components/feedback/SnackbarAlertProvider';
import EditNoteDialog from '../../../components/notes/edit/EditNoteDialog';
import useDeleteNote from '../../../graphql/note/hooks/useDeleteNote';
import useUpdateNote from '../../../graphql/note/hooks/useUpdateNote';
import useDebounceCollaborativeInputEditor from '../../../hooks/useDebounceCollaborativeInputEditor';

const QUERY = gql(`
  query EditNoteDialogRoute($id: ID!) {
    note(id: $id) {
      id
      title
      content {
        text
        revision
      }
    }
  }
`);

const SUBSCRIPTION_UPDATED = gql(`
  subscription EditNoteDialogRouteNoteUpdated {
    noteUpdated {
      id
      patch {
        title
        content {
          changeset
          revision
        }
      }
    }
  }
`);

function RouteClosableEditNoteDialog({
  open,
  onClosing,
  onClosed,
}: RouteClosableComponentProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const showError = useSnackbarError();

  const params = useParams<'id'>();

  const { data, client, subscribeToMore } = useSuspenseQuery(QUERY, {
    variables: {
      id: params.id ?? '',
    },
  });

  const noteId = String(data.note.id);

  const [title, setTitle] = useState('');

  const handleTitleChanged = async (newTitle: string) => {
    setTitle(newTitle);
    await updateNote({
      id: noteId,
      patch: {
        title: newTitle,
      },
    });
  };

  const {
    inputRef: contentInputRef,
    value: contentValue,
    revision: contentRevision,
    onInput: contentOnInput,
    onSelect: contentOnSelect,
    onExternalChange: contentOnExternalChange,
  } = useDebounceCollaborativeInputEditor({
    initialHeadText: {
      revision: data.note.content.revision,
      changeset: Changeset.fromInsertion(data.note.content.text),
    },
    async submitChanges(changes) {
      const contentResult = await updateNote({
        id: noteId,
        patch: {
          content: {
            targetRevision: changes.revision,
            changeset: changes.changeset,
          },
        },
      });

      const revision = contentResult?.patch?.content?.revision;
      if (!revision) {
        showError('Failed to acknowledge content changes!');
        return;
      }

      return revision;
    },
    debounce: {
      wait: 150,
      maxWait: 500,
    },
  });

  useEffect(() => {
    subscribeToMore({
      document: SUBSCRIPTION_UPDATED,
      updateQuery(existing, { subscriptionData }) {
        // const existingNote = existing.note;
        const noteUpdate = subscriptionData.data.noteUpdated;
        console.log('received external change', noteUpdate.patch.content?.revision);

        if (noteUpdate.patch.title) {
          setTitle(noteUpdate.patch.title);
        }

        if (noteUpdate.patch.content) {
          contentOnExternalChange(noteUpdate.patch.content);
        }

        return existing;
      },
    });
  }, [subscribeToMore, contentInputRef, contentOnExternalChange]);

  function handleDeleteNote() {
    return deleteNote(noteId);
  }

  function handleClosed() {
    client.cache.writeFragment({
      id: client.cache.identify({ id: noteId, __typename: 'Note' }),
      fragment: gql(`
        fragment EditNoteDialogRouteUpdateNote on Note {
          title
          content {
            revision
            text
          }
        }
      `),
      data: {
        title,
        content: {
          revision: contentRevision,
          text: contentValue,
        },
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
          onDelete: handleDeleteNote,
          titleFieldProps: {
            value: title,
            onChange: (e) => {
              void handleTitleChanged(String(e.target.value));
            },
          },
          contentFieldProps: {
            inputRef: contentInputRef,
            value: contentValue,
            onSelect: contentOnSelect,
            onInput: contentOnInput,
          },
        },
      }}
    ></EditNoteDialog>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
