import { useSuspenseQuery } from '@apollo/client';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import EditNoteDialogComponent from '../../notes/EditNoteDialog';
import GET_NOTE from '../../notes/graphql/GET_NOTE';
import { useProxyNavigate } from '../../router/ProxyRoutesProvider';
import usePreviousLocation from '../../router/usePreviousLocation';

export default function EditNoteDialog() {
  const navigate = useProxyNavigate();
  const previousLocation = usePreviousLocation();
  const params = useParams<'id'>();
  const [open, setOpen] = useState(true);

  const { data } = useSuspenseQuery(GET_NOTE, {
    variables: {
      id: params.id ?? '',
    },
  });

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
