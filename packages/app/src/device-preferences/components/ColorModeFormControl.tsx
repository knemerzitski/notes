import {
  RadioGroupProps,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { useId } from 'react';

import { ColorMode } from '../../__generated__/graphql';
import { useColorMode } from '../hooks/useColorMode';
import { colorModes } from '../utils/color-modes';

export function ColorModeFormControl() {
  const radioId = useId();
  const [colorMode, setColorMode] = useColorMode();

  const handleChange: RadioGroupProps['onChange'] = (e) => {
    const newColorMode = e.target.value as ColorMode;
    if (colorMode === newColorMode) {
      return;
    }

    setColorMode(newColorMode);
  };

  return (
    <FormControl>
      <FormLabel id={radioId}>Appearance</FormLabel>
      <RadioGroup
        name="appearance"
        value={colorMode}
        aria-labelledby={radioId}
        onChange={handleChange}
      >
        {colorModes.map(({ text, value }) => (
          <FormControlLabel key={value} value={value} label={text} control={<Radio />} />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
