import { ThemeOptions, PaletteOptions, Theme } from '@mui/material';

declare module '@mui/material/styles' {
  interface Theme {
    shadowsNamed: {
      scrollEnd: string;
    };
  }
  interface ThemeOptions {
    shadowsNamed?: {
      scrollEnd?: string;
    };
  }

  interface ZIndex {
    top: number;
  }

  interface ZIndexOptions {
    top?: number;
  }

  interface Palette {
    scroll: {
      thumb: string;
      thumbHover: string;
      trackPiece: string;
    };
    dividerHoverOpacity: number;
  }
  interface PaletteOptions {
    scroll?: {
      thumb?: string;
      thumbHover?: string;
      trackPiece?: string;
    };
    dividerHoverOpacity?: number;
  }
}

export interface MultiThemeOptions {
  base: (mode: PaletteOptions['mode']) => ThemeOptions;
  dynamic: (theme: Theme) => ThemeOptions;
}

export const themeOptions: MultiThemeOptions = {
  base(mode = 'light') {
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
        MuiIconButton: {
          defaultProps: {
            color: 'inherit',
          },
        },
        MuiDialog: {
          defaultProps: {
            closeAfterTransition: false,
          },
        },
        MuiTooltip: {
          defaultProps: {
            // enterDelay: 300,
          },
        },
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
        MuiBadge: {
          styleOverrides: {
            badge: {
              right: 3,
              top: 4,
            },
          },
        },
      },
      zIndex: {
        top: 1600,
      },
    };
  },
  dynamic(_theme) {
    return {};
  },
};
