import MenuIcon from '@mui/icons-material/Menu';
import { IconButton, IconButtonProps } from '@mui/material';

export default function AccountButton(props: IconButtonProps) {
  return (
    <IconButton color="inherit" aria-label="app menu" size="large" {...props}>
      <MenuIcon />
    </IconButton>
  );
}
