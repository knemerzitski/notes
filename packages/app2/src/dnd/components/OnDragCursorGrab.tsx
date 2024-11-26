import { useDndMonitor } from '@dnd-kit/core';
import { Box, css, styled } from '@mui/material';
import { ReactNode, useState } from 'react';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

export function OnDragCursorGrab({ children }: { children: ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  useDndMonitor({
    onDragStart() {
      setIsDragging(true);
    },
    onDragEnd() {
      setIsDragging(false);
    },
  });

  return <BoxStyled isDragging={isDragging}>{children}</BoxStyled>;
}

export const dragMove = {
  style: ({ isDragging }: { isDragging: boolean }) => {
    if (isDragging) {
      return css`
        * {
          cursor: grabbing !important;
        }
      `;
    }
    return css`
      * {
        cursor: grab !important;
      }
    `;
  },
  props: ['isDragging'],
};

const BoxStyled = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(dragMove.props),
})(dragMove.style);
