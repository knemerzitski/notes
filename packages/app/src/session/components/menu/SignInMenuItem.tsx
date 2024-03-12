import { MenuItem } from '@mui/material';
import { useState } from 'react';

import { useSession } from '../../context/SessionProvider';
import SignInModal from '../SignInModal';

export default function SignInMenuItem() {
  const session = useSession();

  const [modalOpen, setModalOpen] = useState(false);

  function handleCloseModal() {
    setModalOpen(false);
  }

  if (!session.isExpired) return null;

  return (
    <>
      <MenuItem
        onClick={() => {
          setModalOpen(true);
        }}
      >
        Sign in
      </MenuItem>

      <SignInModal sessionHint={session} open={modalOpen} onClose={handleCloseModal} />
    </>
  );
}
