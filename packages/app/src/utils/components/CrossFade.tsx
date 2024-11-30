import { Fade, BoxProps, FadeProps, Box, css, styled } from '@mui/material';
import { ReactNode } from 'react';

/**
 * Fade between elements based on in condition.
 */
export function CrossFade({
  BoxProps,
  elements,
  FadeProps,
}: {
  BoxProps?: Omit<BoxProps, 'sx'>;
  FadeProps?: Omit<FadeProps, 'in' | 'children'>;
  elements: {
    in: FadeProps['in'];
    FadeProps?: Omit<FadeProps, 'in' | 'children'>;
    BoxProps?: Omit<BoxProps, 'sx'>;
    element: ReactNode;
  }[];
}) {
  return (
    <RootBox {...BoxProps}>
      {elements.map((item, index) => (
        <Fade key={index} in={item.in} {...FadeProps} {...item.FadeProps}>
          <InFadeBox {...item.BoxProps}>{item.element}</InFadeBox>
        </Fade>
      ))}
    </RootBox>
  );
}

export const RootBox = styled(Box)(css`
  position: relative;
  width: 1em;
  height: 1em;
`);

export const InFadeBox = styled(Box)(css`
  position: absolute;
  left: 0;
  top: 0;
`);
