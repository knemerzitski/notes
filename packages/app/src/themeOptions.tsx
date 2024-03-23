import { ThemeOptions, PaletteOptions } from '@mui/material';

interface PaletteExtension {
  scroll: {
    thumb: string;
    thumbHover: string;
    trackPiece: string;
  };
}

interface ShadowsNamed {
  shadowsNamed: {
    scrollEnd: string;
  };
}

declare module '@mui/material/styles' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Theme extends ShadowsNamed {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ThemeOptions extends ShadowsNamed {}

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Palette extends PaletteExtension {}
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface PaletteOptions extends PaletteExtension {}
}

export default function themeOptions(
  mode: PaletteOptions['mode'] = 'light'
): ThemeOptions {
  return {
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            background: {
              default: '#fff',
              paper: '#fff',
            },
            scroll: {
              thumb: 'rgba(0,0,0,.20)',
              thumbHover: 'rgba(0,0,0,.35)',
              trackPiece: 'hsla(0,0%,95%,.8)',
            },
          }
        : {
            text: {
              primary: '#f2f2f2',
              secondary: 'rgba(242,242,242, 0.7)',
              disabled: 'rgba(242,242,242, 0.5)',
            },
            background: {
              default: '#1d1c21', // Default: #121212
              paper: '#1d1c21', // Default: #121212
            },
            scroll: {
              thumb: 'rgba(255,255,255,.15)',
              thumbHover: 'rgba(255,255,255,.2)',
              trackPiece: 'hsla(0,0%,20%,.3)',
            },
            tonalOffset: 0.1,
          }),
    },
    shadowsNamed: {
      scrollEnd: '0px 0px 5px 2px rgba(0,0,0,0.2)',
    },
    components: {
      MuiAlert: {
        defaultProps: {
          elevation: 8,
          variant: 'filled',
        },
      },
    },
  };
}
