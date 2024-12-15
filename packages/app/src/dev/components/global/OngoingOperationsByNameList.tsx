import { Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { useStatsLink } from '../../../graphql/context/stats-link';
import { useUserId } from '../../../user/context/user-id';

function copyStats(statsLink: ReturnType<typeof useStatsLink>, userId: string) {
  const userOngoing = statsLink.getUserOngoing(userId);
  return Object.fromEntries(
    userOngoing.getNames().map((opName) => [opName, userOngoing.byName(opName)])
  );
}

export function OngoingOperationsByNameList() {
  const statsLink = useStatsLink();
  const userId = useUserId();

  const [stats, setStats] = useState(() => copyStats(statsLink, userId));

  useEffect(() => {
    setStats(copyStats(statsLink, userId));
    return statsLink.getUserEventBus(userId).on('byType', () => {
      setStats(copyStats(statsLink, userId));
    });
  }, [statsLink, userId]);

  return (
    <>
      {Object.entries(stats).map(([opName, count]) => (
        <Typography key={opName}>
          {opName} ({count})
        </Typography>
      ))}
    </>
  );
}
