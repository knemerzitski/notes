import AddIcon from '@mui/icons-material/Add';
import { Fab, FabProps } from '@mui/material';

export interface CreateNoteFabProps extends FabProps {
  onCreate?: () => void;
}

export default function CreateNoteFab({ onCreate, ...restProps }: CreateNoteFabProps) {
  return (
    <Fab
      {...restProps}
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
