import useBeforeUnload from '../../common/hooks/useBeforeUnload';
import useStatsLink from '../hooks/useStatsLink';

export default function ConfirmLeaveOngoingMutations() {
  const statsLink = useStatsLink();

  useBeforeUnload((e) => {
    if (statsLink.ongoing.mutation > 0) {
      e.preventDefault();
    }
  });

  return null;
}
