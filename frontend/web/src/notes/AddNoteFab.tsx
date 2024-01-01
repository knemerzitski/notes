import AddIcon from '@mui/icons-material/Add';
import { Fab } from '@mui/material';
import { startTransition } from 'react';

import { useSnackbarError } from '../components/feedback/SnackbarAlertProvider';
import { useProxyNavigate } from '../router/ProxyRoutesProvider';
import useCreateNote from '../graphql/note/hooks/useCreateNote';

export default function AddNoteFab() {
  const navigate = useProxyNavigate();
  const insertNote = useCreateNote();
  const showError = useSnackbarError();

  async function handleClick() {
    const note = await insertNote('', '');

    if (!note) {
      showError('Failed to add insert note');
      return;
    }

    startTransition(() => {
      navigate(`/note/${note.id}`, {
        state: {
          autoFocus: true,
        },
      });
    });
  }

  return (
    <Fab
      color="primary"
      size="large"
      aria-label="new note"
      onClick={() => {
        void handleClick();
      }}
      sx={(theme) => ({
        position: 'fixed',
        bottom: theme.spacing(2),
        right: theme.spacing(2),
      })}
    >
      <AddIcon />
    </Fab>
  );
}
