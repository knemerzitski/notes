import { Box, BoxProps, css, styled } from '@mui/material';
import {
  forwardRef,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import getCaretCoordinates from 'textarea-caret';

import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';

/**
 * Renders a custom caret for a input or textarea element
 */
export const InputCaret = forwardRef<
  HTMLDivElement,
  BoxProps & {
    caret: {
      /**
       * Ref to element that contains either a textarea or input
       */
      inputRef: RefObject<unknown>;
      /**
       * Text index where to render the caret.
       */
      selection: number;
      /**
       * Height of caret relative to text line height
       * @default 0.8
       */
      heightPercentage?: number;
      /**
       * @default "white"
       */
      color: string;
      /**
       * Adjust caret left position
       */
      leftOffset?: number;
      /**
       * Adjust caret left position
       */
      topOffset?: number;
      /**
       * Change this value to reset caret blinking.
       * Should be used to stop caret from blinking when user is typing.
       */
      resetBlink?: number;
    };
  }
>(function InputCaret(
  {
    caret: {
      inputRef,
      selection,
      heightPercentage = 0.8,
      leftOffset = 0,
      topOffset = 0,
      color,
      resetBlink = selection,
    },
    ...restProps
  },
  ref
) {
  const boxRef = useRef<HTMLDivElement>();
  const [enableBlink, setEnableBlink] = useState(false);

  const [caretCoordinates, setCaretCoordinates] = useState<
    ReturnType<typeof getCaretCoordinates>
  >({
    top: 0,
    left: 0,
    height: 16,
  });

  const subtractHeight = caretCoordinates.height * (1 - heightPercentage);

  const left = caretCoordinates.left + leftOffset;
  const top = caretCoordinates.top + topOffset + subtractHeight / 2;
  const height = caretCoordinates.height - subtractHeight;

  useLayoutEffect(() => {
    const maybeInputEl = inputRef.current;
    if (!(maybeInputEl instanceof HTMLElement)) {
      return;
    }
    const inputEl = maybeInputEl;

    function update() {
      setCaretCoordinates(getCaretCoordinates(inputEl, selection));
    }

    update();

    inputEl.addEventListener('input', update);
    return () => {
      inputEl.removeEventListener('input', update);
    };
  }, [inputRef, selection]);

  // Restart blink animation when `resetBlink` changes
  useEffect(() => {
    setEnableBlink(false);
    setTimeout(() => {
      setEnableBlink(true);
    }, 1);
  }, [resetBlink]);

  return (
    <BoxStyled
      {...restProps}
      ref={(el: HTMLDivElement) => {
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
        boxRef.current = el;
      }}
      caretColor={color}
      enableBlink={enableBlink}
      top={top}
      left={left}
      height={height}
    />
  );
});

const color = {
  style: ({ caretColor = 'white' }: { caretColor?: string }) => {
    return css`
      background: ${caretColor};
    `;
  },
  props: ['caretColor'],
};

const enableBlink = {
  style: ({ enableBlink = false }: { enableBlink?: boolean }) => {
    if (enableBlink) {
      return css`
        animation-name: blink;
      `;
    }
    return;
  },
  props: ['enableBlink'],
};

const BoxStyled = styled(Box, {
  shouldForwardProp: mergeShouldForwardProp(color.props, enableBlink.props),
})<{ caretColor?: string; enableBlink?: boolean }>(
  color.style,
  enableBlink.style,
  css`
    width: 1px;

    position: absolute;
    user-select: none;
    pointer-events: none;

    animation-duration: 1s;
    animation-iteration-count: infinite;
    animation-delay: 0.5s;

    @keyframes blink {
      from {
        opacity: 1;
      }

      49.9% {
        opacity: 1;
      }
      50% {
        opacity: 0;
      }

      99.9% {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }
  `
);
