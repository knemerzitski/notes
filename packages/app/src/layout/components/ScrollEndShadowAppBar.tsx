import { forwardRef } from 'react';

import { AppBar } from './AppBar';

export const ScrollEndShadowAppBar = forwardRef<
  HTMLElement,
  Parameters<typeof AppBar>[0]
>(function ScrollEndShadowAppBar(props, ref) {
  return <AppBar {...props} ref={ref} shadow={(theme) => theme.shadowsNamed.scrollEnd} />;
});
