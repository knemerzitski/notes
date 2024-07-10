import { useApolloClient } from '@apollo/client';

import { useProxyNavigate } from '../../../router/context/ProxyRoutesProvider';
import BaseCreateNoteFab, {
  CreateNoteFabProps,
} from '../../base/components/CreateNoteFab';
import useCreateNote from '../hooks/useCreateNote';
import { insertLocalNoteToNotesConnection } from '../policies/Query/localNotesConnection';

export default function CreateNoteFab(props: Omit<CreateNoteFabProps, 'onCreate'>) {
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
