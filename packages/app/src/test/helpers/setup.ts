import { beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';

if (import.meta.env.MODE !== 'production') {
  loadDevMessages();
  loadErrorMessages();
}

beforeEach(() => {
  cleanup();
});
