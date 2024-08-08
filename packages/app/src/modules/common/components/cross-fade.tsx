import { Box, Fade, BoxProps, FadeProps } from '@mui/material';
import { ReactNode } from 'react';

interface CrossFadeProps extends Omit<FadeProps, 'children'> {
  /**
   * Size of the component. Is required since absolute positioning is used.
   * If using a string, you need to provide the CSS unit, e.g. '3rem'.
   * @default 24
   */
  size: string | number;
  boxProps?: BoxProps;
  elements: {
    in: FadeProps['in'];
    fadeProps?: Omit<FadeProps, 'children'>;
    boxProps?: BoxProps;
    element: ReactNode;
  }[];
}

/**
 * You must define width and height for CrossFade as elements
 * are rendered in a stack.
 */
export function CrossFade({
  size,
  boxProps,
  elements,
  ...restProps
}: CrossFadeProps) {
  return (
    <Box
      {...boxProps}
      sx={{
        position: 'relative',
        width: size,
        height: size,
        fontSize: size,
        ...boxProps?.sx,
      }}
    >
      {elements.map((item, index) => (
        <Fade key={index} in={item.in} {...item.fadeProps} {...restProps}>
          <Box
            {...item.boxProps}
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              ...item.boxProps?.sx,
            }}
          >
            {item.element}
          </Box>
        </Fade>
      ))}
    </Box>
  );
}
