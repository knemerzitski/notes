import { ListItem } from '@mui/material';
import { DemoLoginButton } from './DemoLoginButton';
import { isDemoEnabled } from '../utils/is-demo-enabled';

export const DemoLoginItems = isDemoEnabled() ? _DemoLoginItems : () => null;

function _DemoLoginItems() {
  return (
    <>
      <ListItem>
        <DemoLoginButton demoUserId="user-alice-01" text="Try Demo Account 1 (Alice)" />
      </ListItem>
      <ListItem>
        <DemoLoginButton demoUserId="user-bob-02" text="Try Demo Account 2 (Bob)" />
      </ListItem>
      <ListItem>
        <DemoLoginButton demoUserId="user-carol-03" text="Try Demo Account 3 (Carol)" />
      </ListItem>
    </>
  );
}
