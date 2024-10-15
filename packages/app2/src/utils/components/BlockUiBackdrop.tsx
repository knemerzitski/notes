import { TopZIndexBackdrop } from '../styled-components/TopZIndexBackdrop';

/**
 * Invisible backdrop that prevents user from interacting with the app
 */
export function BlockUiBackdrop() {
  return <TopZIndexBackdrop invisible={true} open={true} />;
}
