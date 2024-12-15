import { useUserId } from '../../../user/context/user-id';

export function CurrentUserId() {
  const userId = useUserId();

  return userId;
}
