import { Box, BoxProps, Button, ButtonProps, Paper } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

import { useLocalStorage } from '../../utils/hooks/useLocalStorage';
import { useSafeState } from '../hooks/useSafeState';

import { isDevToolsEnabled } from '../utils/dev-tools';

import { DevToolsContent } from './DevToolsContent';

export const DevTools = isDevToolsEnabled() ? FloatingDevTools : () => null;

function FloatingDevTools() {
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useLocalStorage('devToolsOpen', false);
  const [devToolsHeight, setDevToolsHeight] = useLocalStorage<number | null>(
    'devToolsOpenHeight',
    null
  );
  const [isResolvedOpen, setIsResolvedOpen] = useSafeState(false);
  const [isResizing, setIsResizing] = useSafeState(false);

  const handleDragStart = (
    panelElement: HTMLDivElement | null,
    startEvent: React.MouseEvent<HTMLDivElement>
  ) => {
    if (startEvent.button !== 0) return; // Only allow left click for drag

    setIsResizing(true);

    const dragInfo = {
      originalHeight: panelElement?.getBoundingClientRect().height ?? 0,
      pageY: startEvent.pageY,
    };

    const run = (moveEvent: MouseEvent) => {
      const delta = dragInfo.pageY - moveEvent.pageY;
      const newHeight = dragInfo.originalHeight + delta;

      setDevToolsHeight(newHeight);

      if (newHeight < 70) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    const unsub = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', run);
      document.removeEventListener('mouseUp', unsub);
    };

    document.addEventListener('mousemove', run);
    document.addEventListener('mouseup', unsub);
  };

  useEffect(() => {
    setIsResolvedOpen(isOpen ?? false);
  }, [isOpen, isResolvedOpen, setIsResolvedOpen]);

  useEffect(() => {
    if (isResolvedOpen) {
      const previousValue = rootEl?.parentElement?.style.paddingBottom;

      const run = () => {
        const containerHeight = panelRef.current?.getBoundingClientRect().height;
        if (rootEl?.parentElement) {
          rootEl.parentElement.style.paddingBottom = `${containerHeight}px`;
        }
      };

      run();

      if (typeof window !== 'undefined') {
        window.addEventListener('resize', run);

        return () => {
          window.removeEventListener('resize', run);
          if (rootEl?.parentElement && typeof previousValue === 'string') {
            rootEl.parentElement.style.paddingBottom = previousValue;
          }
        };
      }
    }
    return;
  }, [isResolvedOpen, rootEl?.parentElement]);

  useEffect(() => {
    if (rootEl) {
      const el = rootEl;
      const fontSize = getComputedStyle(el).fontSize;
      el.style.setProperty('--tsrd-font-size', fontSize);
    }
  }, [rootEl]);

  const resolvedHeight = devToolsHeight ?? 500;

  return (
    <Box ref={setRootEl}>
      <Paper
        elevation={3}
        sx={{
          visibility: isOpen ? 'visible' : 'hidden',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          position: 'fixed',
          top: 'auto',
          bottom: 0,
          width: '100%',
          zIndex: 99999,
          borderRadius: 0,
        }}
      >
        <TopResizeHandle
          isResizing={isResizing}
          innerProps={{
            onMouseDown: (e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDragStart(panelRef.current, e);
            },
          }}
        />
        <CloseDevToolsButton
          sx={{
            position: 'absolute',
            top: -16,
            right: 8,
          }}
          onClick={() => {
            setIsOpen(false);
          }}
        />
        <Box
          ref={panelRef}
          style={{
            height: resolvedHeight,
          }}
          sx={{
            pt: 1,
          }}
        >
          <DevToolsContent />
        </Box>
      </Paper>

      <OpenDevToolsButton
        sx={{
          position: 'fixed',
          bottom: 8,
          left: 170,
          zIndex: 99999,
          visibility: isOpen ? 'hidden' : 'visible',
        }}
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Dev Tools
      </OpenDevToolsButton>
    </Box>
  );
}

function TopResizeHandle({
  parentProps,
  innerProps,
  isResizing,
}: {
  parentProps?: BoxProps;
  innerProps?: BoxProps;
  isResizing: boolean;
}) {
  const [isHover, setIsHover] = useState(false);

  const showHandle = isHover || isResizing;

  return (
    <Box
      {...parentProps}
      sx={{
        position: 'absolute',
        height: 4,
        top: 0,
        width: '100%',
        ...(showHandle && {
          backgroundColor: (theme) => theme.palette.primary.main,
          cursor: 'row-resize',
        }),
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...parentProps?.sx,
      }}
    >
      <Box
        onMouseEnter={() => {
          setIsHover(true);
        }}
        onMouseLeave={() => {
          setIsHover(false);
        }}
        {...innerProps}
        sx={{
          position: 'absolute',
          left: 0,
          right: 30,
          height: '100%',
          // eslint-disable-next-line @typescript-eslint/no-misused-spread
          ...innerProps?.sx,
        }}
      />
    </Box>
  );
}

function OpenDevToolsButton(props?: ButtonProps) {
  return (
    <Button
      variant="contained"
      color="warning"
      {...props}
      sx={{
        fontSize: '0.7rem',
        borderRadius: 0.5,
        px: 1,
        py: 0.5,
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...props?.sx,
      }}
    >
      Dev panel
    </Button>
  );
}

function CloseDevToolsButton(props?: ButtonProps) {
  return (
    <Button
      {...props}
      sx={{
        p: 0.5,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderBottom: 'none',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        backgroundImage:
          'linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.1))',
        minWidth: 0,
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...props?.sx,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="10"
        height="6"
        fill="none"
        viewBox="0 0 10 6"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.667"
          d="M1 1l4 4 4-4"
        ></path>
      </svg>
    </Button>
  );
}
