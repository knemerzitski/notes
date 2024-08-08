import { startTransition } from 'react';

import { useProxyNavigate } from '../../../router/context/proxy-routes-provider';
import {
  CreateNoteFabProps, CreateNoteFab as BaseCreateNoteFab
} from '../../base/components/create-note-fab';

export function CreateNoteFab(props: Omit<CreateNoteFabProps, 'onCreate'>) {
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
