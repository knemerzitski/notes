import {
  RadioGroupProps,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useId } from 'react';

import { LayoutMode } from '../../__generated__/graphql';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { layoutModes } from '../utils/layout-modes';

export function LayoutModeFormControl() {
  const radioId = useId();
  const [layoutMode, setLayoutMode] = useLayoutMode();

  const handleChange: RadioGroupProps['onChange'] = (e) => {
    const newLayoutMode = e.target.value as LayoutMode;
    if (layoutMode === newLayoutMode) {
      return;
    }

    setLayoutMode(newLayoutMode);
  };

  return (
    <FormControl>
      <FormLabel id={radioId}>Layout</FormLabel>
      <RadioGroup
        name="layout"
        value={layoutMode}
        aria-labelledby={radioId}
        onChange={handleChange}
      >
        {layoutModes.map(({ text, value }) => (
          <FormControlLabel key={value} value={value} label={text} control={<Radio />} />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
