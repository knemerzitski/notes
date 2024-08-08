import AddIcon from '@mui/icons-material/Add';
import { Fab, FabProps } from '@mui/material';
import { useEffect, useId } from 'react';

import { useSubscribeRenderingFab } from '../../../common/components/rendered-fabs-tracking-provider';

export interface CreateNoteFabProps {
  fabProps?: FabProps;
  onCreate?: () => void;
}

export function CreateNoteFab({ onCreate, fabProps }: CreateNoteFabProps) {
  const id = useId();
  const subscribeRenderingFab = useSubscribeRenderingFab();

  useEffect(() => subscribeRenderingFab?.(id), [id, subscribeRenderingFab]);

  return (
    <Fab
      {...fabProps}
      color="primary"
      size="large"
      aria-label="new note"
      onClick={onCreate}
      sx={(theme) => ({
        position: 'fixed',
        bottom: theme.spacing(2),
        right: theme.spacing(2),
      })}
    >
      <AddIcon />
    </Fab>
  );
}
