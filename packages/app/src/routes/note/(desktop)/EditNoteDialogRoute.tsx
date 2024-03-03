import { useSuspenseQuery } from '@apollo/client';
import { useEffect } from 'react';
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
      title {
        latestText
        latestRevision
      }
      content {
        latestText
        latestRevision
      }
    }
  }
`);

const SUBSCRIPTION_UPDATED = gql(`
  subscription EditNoteDialogRouteNoteUpdated {
    noteUpdated {
      id
      patch {
        title {
          changeset
          revision
        }
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

  const debounce = {
    wait: 250,
    maxWait: 600,
  };

  const {
    inputRef: titleInputRef,
    value: titleValue,
    revision: titleRevision,
    onInput: titleOnInput,
    onSelect: titleOnSelect,
    onExternalChange: titleOnExternalChange,
  } = useDebounceCollaborativeInputEditor({
    initialHeadText: {
      revision: data.note.title.latestRevision,
      changeset: Changeset.fromInsertion(data.note.title.latestText),
    },
    async submitChanges(changes) {
      const titleResult = await updateNote({
        id: noteId,
        patch: {
          title: {
            targetRevision: changes.revision,
            changeset: changes.changeset,
          },
        },
      });

      const revision = titleResult?.patch?.title?.revision;
      if (!revision) {
        showError('Failed to acknowledge title changes!');
        return;
      }

      return revision;
    },
    debounce,
  });

  const {
    inputRef: contentInputRef,
    value: contentValue,
    revision: contentRevision,
    onInput: contentOnInput,
    onSelect: contentOnSelect,
    onExternalChange: contentOnExternalChange,
  } = useDebounceCollaborativeInputEditor({
    initialHeadText: {
      revision: data.note.content.latestRevision,
      changeset: Changeset.fromInsertion(data.note.content.latestText),
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
    debounce,
  });

  useEffect(() => {
    subscribeToMore({
      document: SUBSCRIPTION_UPDATED,
      updateQuery(existing, { subscriptionData }) {
        const noteUpdate = subscriptionData.data.noteUpdated;

        if (noteUpdate.patch.title) {
          titleOnExternalChange(noteUpdate.patch.title);
        }

        if (noteUpdate.patch.content) {
          contentOnExternalChange(noteUpdate.patch.content);
        }

        return existing;
      },
    });
  }, [subscribeToMore, titleOnExternalChange, contentOnExternalChange]);

  function handleDeleteNote() {
    return deleteNote(noteId);
  }

  function handleClosed() {
    client.cache.writeFragment({
      id: client.cache.identify({ id: noteId, __typename: 'Note' }),
      fragment: gql(`
        fragment EditNoteDialogRouteUpdateNote on Note {
          title {
            latestText
            latestRevision
          }
          content {
            latestText
            latestRevision
          }
        }
      `),
      data: {
        title: {
          latestText: titleValue,
          latestRevision: titleRevision,
        },
        content: {
          latestText: contentValue,
          latestRevision: contentRevision,
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
            inputRef: titleInputRef,
            value: titleValue,
            onSelect: titleOnSelect,
            onInput: titleOnInput,
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
