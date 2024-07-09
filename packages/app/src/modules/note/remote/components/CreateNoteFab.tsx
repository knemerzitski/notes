import { startTransition } from 'react';

import { useProxyNavigate } from '../../../router/context/ProxyRoutesProvider';
import BaseCreateNoteFab, {
  CreateNoteFabProps,
} from '../../base/components/CreateNoteFab';

export default function CreateNoteFab(props: Omit<CreateNoteFabProps, 'onCreate'>) {
  const navigate = useProxyNavigate();

  function handleCreate() {
    startTransition(() => {
      navigate('/note', {
        state: {
          newNote: true,
          autoFocus: true,
        },
      });
    });
  }

  return <BaseCreateNoteFab onCreate={handleCreate} {...props} />;
}
