import { ListItem } from '@mui/material';
import { DemoLoginButton } from './DemoLoginButton';
import { isDemoEnabled } from '../utils/is-demo-enabled';

export const DemoLoginItems = isDemoEnabled() ? _DemoLoginItems : () => null;

function _DemoLoginItems() {
  return (
    <>
      <ListItem>
        <DemoLoginButton demoUserId="demo-user-1" text="Sign In With Demo Account 1" />
      </ListItem>
      <ListItem>
        <DemoLoginButton demoUserId="demo-user-2" text="Sign In With Demo Account 2" />
      </ListItem>
    </>
  );
}
