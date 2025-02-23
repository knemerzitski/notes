import { useIsLocalOnlyUser } from "../../user/hooks/useIsLocalOnlyUser";
import { useIsOnline } from "../../utils/hooks/useIsOnline";


export function useDefaultIsSearchOffline(){
    const isLocalOnlyUser = useIsLocalOnlyUser();
    const isOnline = useIsOnline();
  
   return isLocalOnlyUser || !isOnline;
}