import { useApolloClient } from '@apollo/client';

import { useProxyNavigate } from '../../../router/context/proxy-routes-provider';
import {
  CreateNoteFabProps, CreateNoteFab as BaseCreateNoteFab
} from '../../base/components/create-note-fab';
import { useCreateNote } from '../hooks/use-create-note';
import { insertLocalNoteToNotesConnection } from '../policies/query/local-notes-connection';

export function CreateNoteFab(props: Omit<CreateNoteFabProps, 'onCreate'>) {
  const apolloClient = useApolloClient();
  const navigate = useProxyNavigate();

  const createNote = useCreateNote();

  function handleCreate() {
    const newNote = createNote();
    insertLocalNoteToNotesConnection(apolloClient.cache, newNote);

    navigate(`/local/note/${newNote.id}`, {
      state: {
        autoFocus: true,
      },
    });
  }

  return <BaseCreateNoteFab onCreate={handleCreate} {...props} />;
}
