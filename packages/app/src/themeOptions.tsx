import { ThemeOptions, PaletteOptions } from '@mui/material';

interface PaletteExtension {
  scroll: {
    thumb: string;
    thumbHover: string;
    trackPiece: string;
  };
  dividerHoverOpacity: number;
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

export type ThemeOptionsFn = (mode: PaletteOptions['mode']) => ThemeOptions;

const themeOptions: ThemeOptionsFn = function (mode = 'light') {
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
            dividerHoverOpacity: 0.18,
          }
        : {
            text: {
              primary: '#f2f2f2',
              secondary: 'rgba(242,242,242, 0.7)',
              disabled: 'rgba(242,242,242, 0.5)',
            },
            info: {
              main: '#282736',
              light: '#3a394f',
              dark: '#28273b',
              contrastText: '#fff',
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
            dividerHoverOpacity: 0.24,
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
        styleOverrides: {
          action: {
            // Center close button
            alignSelf: 'center',
            justifySelf: 'center',
            paddingTop: 0,
            paddingBottom: 0,
          },
        },
      },
    },
  };
};

export default themeOptions;
