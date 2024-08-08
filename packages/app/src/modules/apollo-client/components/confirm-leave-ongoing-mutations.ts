import { useBeforeUnload } from '../../common/hooks/use-before-unload';
import { useStatsLink } from '../hooks/use-stats-link';

export function ConfirmLeaveOngoingMutations() {
  const statsLink = useStatsLink();

  useBeforeUnload((e) => {
    if (statsLink.ongoing.mutation > 0) {
      e.preventDefault();
    }
  });

  return null;
}
