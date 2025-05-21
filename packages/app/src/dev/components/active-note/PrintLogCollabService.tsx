import { Button } from '@mui/material';

import { useCollabService } from '../../../note/hooks/useCollabService';

export function PrintLogCollabService() {
  const collabService = useCollabService();

  function handleClick() {
    console.log(collabService);
  }

  return <Button onClick={handleClick}>Log CollabService</Button>;
}
