import { mockFn } from 'vitest-mock-extended';

import { updateDisplayName as _updateDisplayName } from '../update-display-name';

export const updateDisplayName = mockFn<typeof _updateDisplayName>();
