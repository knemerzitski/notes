import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Divider, IconButton } from '@mui/material';

import { AppearanceMenuList } from './appearance-menu-list';

interface AppearanceMenuListProps {
  onClickBack?: () => void;
  onSelected?: () => void;
}

export function AppearanceMenu({
  onClickBack,
  onSelected,
}: AppearanceMenuListProps) {
  return (
    <>
      <Box
        sx={{
          px: 1,
          py: 0.5,
        }}
      >
        {onClickBack && (
          <IconButton
            color="inherit"
            aria-label="back to all settings"
            size="medium"
            onClick={onClickBack}
            sx={{
              mr: 0.5,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        Appearance
      </Box>
      <Divider />
      <AppearanceMenuList onSelected={onSelected} />
    </>
  );
}
