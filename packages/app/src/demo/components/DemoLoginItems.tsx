import { ListItem } from '@mui/material';

import { isDemoEnabled } from '../utils/is-demo-enabled';

import { DemoLoginButton } from './DemoLoginButton';

export const DemoLoginItems = isDemoEnabled() ? _DemoLoginItems : () => null;

interface DemoLoginItemsProps {
  onSuccess?: (demoUserId: string) => void;
  onError?: (demoUserId: string) => void;
}

function _DemoLoginItems({ onSuccess, onError }: DemoLoginItemsProps) {
  return (
    <>
      <ListItem>
        <DemoLoginButton
          demoUserId="user-alice-01"
          text="Sign In Demo Account 1 (Alice)"
          onSuccess={() => onSuccess?.('user-alice-01')}
          onError={() => onError?.('user-alice-01')}
        />
      </ListItem>
      <ListItem>
        <DemoLoginButton
          demoUserId="user-bob-02"
          text="Sign In Demo Account 2 (Bob)"
          onSuccess={() => onSuccess?.('user-bob-02')}
          onError={() => onError?.('user-bob-02')}
        />
      </ListItem>
      <ListItem>
        <DemoLoginButton
          demoUserId="user-carol-03"
          text="Sign In Demo Account 3 (Carol)"
          onSuccess={() => onSuccess?.('user-carol-03')}
          onError={() => onError?.('user-carol-03')}
        />
      </ListItem>
    </>
  );
}
