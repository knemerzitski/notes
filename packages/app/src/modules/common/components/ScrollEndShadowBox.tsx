import { Box, BoxProps } from '@mui/material';
import { ReactNode, Ref, useState } from 'react';

import useIsElementScrollEnd from '../hooks/useIsElementScrollEnd';

export interface ScrollEndShadowBoxProps {
  renderMainElement: (ref: Ref<unknown>) => ReactNode;
  bottomElement: ReactNode;
  bottomContainerProps?: BoxProps;
}

export default function ScrollEndShadowBox({
  renderMainElement,
  bottomElement,
  bottomContainerProps,
}: ScrollEndShadowBoxProps) {
  const [mainEl, setMainEl] = useState<HTMLElement>();
  const isScrollEnd = useIsElementScrollEnd(mainEl);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {renderMainElement((el: HTMLElement) => {
        setMainEl(el);
      })}
      <Box
        {...bottomContainerProps}
        sx={{
          ...bottomContainerProps?.sx,
          ...(!isScrollEnd && {
            boxShadow: (theme) => theme.shadowsNamed.scrollEnd,
          }),
        }}
      >
        {bottomElement}
      </Box>
    </Box>
  );
}
