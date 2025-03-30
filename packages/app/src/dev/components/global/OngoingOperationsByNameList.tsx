import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { useStatsLink } from '../../../graphql/context/stats-link';
import { useUserId } from '../../../user/context/user-id';

export function OngoingOperationsByNameList() {
  const statsLink = useStatsLink();
  const userId = useUserId();

  const [names, setNames] = useState<string[]>([]);

  useEffect(
    () =>
      statsLink.subscribeToOngoingDocumentsByName(
        (newNames) => {
          setNames([...newNames]);
        },
        {
          filterUserId: (testUserId) => testUserId == null || testUserId === userId,
        }
      ),
    [statsLink, userId]
  );

  return (
    <>
      {names.map((opName) => (
        <Typography key={opName}>{opName}</Typography>
      ))}
    </>
  );
}
