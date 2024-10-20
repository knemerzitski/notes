import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useOnClose } from './on-close';
import { IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { NavigableMenuTitleBox } from '../styled-components/NavigableMenuTitleBox';

type MenuKey =
  | { type: 'custom'; value: string }
  | { type: 'parent' }
  | { type: 'root' }
  | { type: 'none' };
export type SelectNavigableMenuClosure = (key: MenuKey) => void;

const SelectNavigableMenuContext = createContext<SelectNavigableMenuClosure | null>(null);

export function useSelectNavigableMenu(): SelectNavigableMenuClosure {
  const ctx = useContext(SelectNavigableMenuContext);
  if (ctx === null) {
    throw new Error('useSelectNavigableMenu() requires context <NavigableMenuProvider>');
  }
  return ctx;
}

interface NavigableMenuSchema {
  key: string;
  element: ReactNode;
  title?: string;
}

export function NavigableMenuProvider({
  menuSchema,
}: {
  menuSchema: NavigableMenuSchema[];
}) {
  const closeParent = useOnClose();
  const [path, setPath] = useState<string[]>([]);

  const handleSelectMenu: SelectNavigableMenuClosure = useCallback(
    (menuKey) => {
      if (menuKey.type === 'custom') {
        setPath((prev) => [...prev, menuKey.value]);
      } else if (menuKey.type === 'parent') {
        setPath((prev) => prev.slice(0, -1));
      } else if (menuKey.type === 'root') {
        setPath([]);
      } else {
        closeParent();
      }
    },
    [closeParent]
  );

  function handleClickBack() {
    handleSelectMenu({ type: 'parent' });
  }

  const currentKey = path[path.length - 1] ?? 'root';

  const schema = menuSchema.find(({ key }) => key === currentKey) ?? menuSchema[0];
  if (!schema) {
    return null;
  }

  const isSubMenu = schema.key !== 'root';

  return (
    <>
      {isSubMenu && (
        <NavigableMenuTitleBox>
          <IconButton aria-label="back" onClick={handleClickBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography>{schema.title}</Typography>
        </NavigableMenuTitleBox>
      )}

      <SelectNavigableMenuContext.Provider value={handleSelectMenu}>
        {schema.element}
      </SelectNavigableMenuContext.Provider>
    </>
  );
}
