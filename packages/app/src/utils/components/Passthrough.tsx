import { ReactNode } from "react";

export function Passthrough({children}: {children: ReactNode}){
  return children;
}
