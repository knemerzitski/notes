import { makeVar } from '@apollo/client';

import { ColorMode } from '../__generated__/graphql';

import { readPreferences } from './persistence';

const preferences = readPreferences();

export const colorModeVar = makeVar<ColorMode>(preferences.colorMode);
