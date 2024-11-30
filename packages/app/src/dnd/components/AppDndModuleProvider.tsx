import { ReactNode } from 'react';
import { DndContext } from './DndContext';

export function AppDndModuleProvider({ children }: { children: ReactNode }) {
  return <DndContext>{children}</DndContext>;
}
