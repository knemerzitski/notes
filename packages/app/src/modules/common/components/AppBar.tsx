import {
  AppBar as MuiAppBar,
  useScrollTrigger,
  useTheme,
  AppBarProps as MuiAppBarProps,
  Slide,
} from '@mui/material';

import useMobile from '../hooks/useIsMobile';

interface AppBarProps extends MuiAppBarProps {
  slideIn?: boolean;
}

export default function AppBar({ slideIn = true, ...restProps }: AppBarProps) {
  const theme = useTheme();
  const isMobile = useMobile();

  const scrollAtTop = useScrollTrigger({
    disableHysteresis: true,
    threshold: 0,
  });

  const scrollTrigger = useScrollTrigger();

  return (
    <Slide appear={false} direction="down" in={!isMobile || !scrollTrigger || slideIn}>
      <MuiAppBar
        component="nav"
        position="fixed"
        elevation={0}
        {...restProps}
        sx={{
          boxShadow: scrollAtTop ? 5 : 0,
          transition: theme.transitions.create('box-shadow', {
            duration: theme.transitions.duration.shortest,
            easing: theme.transitions.easing.sharp,
          }),
          ...(theme.palette.mode === 'dark' && {
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          }),
          zIndex: (theme) => theme.zIndex.drawer + 1,
          ...restProps.sx,
        }}
      />
    </Slide>
  );
}
