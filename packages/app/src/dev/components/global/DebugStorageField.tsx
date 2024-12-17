import { TextField } from '@mui/material';

import debug from 'debug';
import { useEffect } from 'react';

import { useLocalStorage } from '../../hooks/useLocalStorage';

export function DebugStorageField() {
  const [debugValue = '*', setDebugValue] = useLocalStorage<string>('debug', '*');

  useEffect(() => {
    debug.enable(debugValue);
  }, [debugValue]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void {
    setDebugValue(event.target.value);
  }

  return <TextField value={debugValue} onChange={handleChange} />;
}
