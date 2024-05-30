import useBeforeUnload from '../../common/hooks/useBeforeUnload';
import useStatsLink from '../hooks/useStatsLink';

export default function ConfirmLeaveOngoingMutations() {
  const statsLink = useStatsLink();

  useBeforeUnload((e) => {
    console.log(statsLink.ongoing, statsLink.total);
    if (statsLink.ongoing.mutation > 0) {
      e.preventDefault();
    }
  });

  return null;
}
