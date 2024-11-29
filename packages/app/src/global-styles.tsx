import { GlobalStylesProps, Theme } from '@mui/material';

export type CreateGlobalStylesFn = (theme: Theme) => GlobalStylesProps['styles'];

export const createGlobalStyles: CreateGlobalStylesFn = function (theme) {
  return {
    // Style scroll only on default desktop devices
    '@media ((hover: hover) and (pointer: fine))': {
      '*': {
        body: {
          overflowX: 'hidden',
        },
        '::-webkit-scrollbar': {
          width: 12,
        },
        '::-webkit-scrollbar-button': {
          height: 0,
          width: 0,
        },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.scroll.thumb,
          backgroundClip: 'padding-box',
          border: '1px solid transparent',
          borderRadius: '2px',
        },
        '::-webkit-scrollbar-thumb:hover': {
          backgroundColor: theme.palette.scroll.thumbHover,
        },
        '::-webkit-scrollbar-track-piece': {
          backgroundColor: theme.palette.scroll.trackPiece,
          boxShadow: 'inset 1px 0 0 rgba(0,0,0,.2), inset -1px 0 0 rgba(0,0,0,.1)',
        },
      },
    },
  };
};
