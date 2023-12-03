import { useSuspenseQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import RouteSnackbarError from '../../components/feedback/RouteSnackbarError';
import EditNoteDialogComponent from '../../notes/EditNoteDialog';
import { useProxyNavigate } from '../../router/ProxyRoutesProvider';
import usePreviousLocation from '../../router/usePreviousLocation';
import GET_NOTE from '../../schema/note/documents/GET_NOTE';
import NOTE_UPDATED from '../../schema/note/documents/NOTE_UPDATED';

export default function EditNoteDialog() {
  const navigate = useProxyNavigate();
  const previousLocation = usePreviousLocation();
  const params = useParams<'id'>();
  const [open, setOpen] = useState(true);

  const { data, subscribeToMore } = useSuspenseQuery(GET_NOTE(), {
    variables: {
      id: params.id ?? '',
    },
  });

  useEffect(() => {
    subscribeToMore({
      document: NOTE_UPDATED,
      updateQuery(_cache, { subscriptionData }) {
        const updatedNote = subscriptionData.data.noteUpdated;
        return {
          note: updatedNote,
        };
      },
    });
  }, [subscribeToMore]);

  if (!data.note) {
    return <RouteSnackbarError>{`Note '${params.id}' not found`}</RouteSnackbarError>;
  }

  function handleClosingDialog() {
    setOpen(false);
  }

  function handleClosedDialog() {
    if (previousLocation) {
      navigate(-1);
    } else {
      navigate('/');
    }
  }

  return (
    <EditNoteDialogComponent
      note={data.note}
      open={open}
      onClosing={handleClosingDialog}
      onClosed={handleClosedDialog}
    />
  );
}
