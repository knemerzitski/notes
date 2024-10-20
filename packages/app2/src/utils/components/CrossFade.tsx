import { Fade, BoxProps, FadeProps } from '@mui/material';
import { ReactNode } from 'react';
import { RelativeOneEmBox } from '../styled-components/RelativeOneEmBox';
import { AbsoluteTopLeftBox } from '../styled-components/AbsoluteTopLeftBox';

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
    <RelativeOneEmBox {...BoxProps}>
      {elements.map((item, index) => (
        <Fade key={index} in={item.in} {...FadeProps} {...item.FadeProps}>
          <AbsoluteTopLeftBox {...item.BoxProps}>{item.element}</AbsoluteTopLeftBox>
        </Fade>
      ))}
    </RelativeOneEmBox>
  );
}
