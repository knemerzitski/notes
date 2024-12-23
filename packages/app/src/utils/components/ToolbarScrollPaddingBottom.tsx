import { GlobalStyles, useTheme } from '@mui/material';
import { toolbarHeight } from '../toolbar-height';

/**
 * Prevent scroll focus staying behind fixed elements due to toolbar at the bottom
 */
export function ToolbarScrollPaddingBottom() {
  const theme = useTheme();

  return (
    <GlobalStyles
      styles={{
        html: {
          scrollPaddingBottom: `calc(${toolbarHeight(theme)} + 2px)`,
        },
      }}
    />
  );
}
