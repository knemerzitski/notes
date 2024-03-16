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

  // TODO separate title and content logic data fetching into separate child components
  const {
    inputRef: titleInputRef,
    value: titleValue,
    revision: titleRevision,
    handleInput: titleHandleInput,
    handleSelect: titleHandleSelect,
    handleExternalChange: titleHandleExternalChange,
  } = useDebounceCollaborativeInputEditor({
    debounce,
    editorProps: {
      initialHeadText: {
        revision: data.note.title.latestRevision,
        changeset: Changeset.fromInsertion(data.note.title.latestText),
      },
      async onSubmitChanges(changes) {
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
    },
  });

  const {
    inputRef: contentInputRef,
    value: contentValue,
    revision: contentRevision,
    handleInput: contentHandleInput,
    handleSelect: contentHandleSelect,
    handleExternalChange: contentHandleExternalChange,
  } = useDebounceCollaborativeInputEditor({
    debounce,
    editorProps: {
      initialHeadText: {
        revision: data.note.content.latestRevision,
        changeset: Changeset.fromInsertion(data.note.content.latestText),
      },
      async onSubmitChanges(changes) {
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
    },
  });

  useEffect(() => {
    return subscribeToMore({
      document: SUBSCRIPTION_UPDATED,
      updateQuery(existing, { subscriptionData }) {
        // TODO update cache instead of passing external change from function
        const noteUpdate = subscriptionData.data.noteUpdated;

        if (noteUpdate.patch.title) {
          titleHandleExternalChange(noteUpdate.patch.title);
        }

        if (noteUpdate.patch.content) {
          contentHandleExternalChange(noteUpdate.patch.content);
        }

        return existing;
      },
    });
  }, [subscribeToMore, titleHandleExternalChange, contentHandleExternalChange]);

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
            onSelect: titleHandleSelect,
            onInput: titleHandleInput,
          },
          contentFieldProps: {
            inputRef: contentInputRef,
            value: contentValue,
            onSelect: contentHandleSelect,
            onInput: contentHandleInput,
          },
        },
      }}
    ></EditNoteDialog>
  );
}

export default function EditNoteDialogRoute() {
  return <RouteClosable Component={RouteClosableEditNoteDialog} />;
}
