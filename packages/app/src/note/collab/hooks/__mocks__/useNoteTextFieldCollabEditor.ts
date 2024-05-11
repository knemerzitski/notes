import { beforeEach } from 'vitest';
import { mockFn, mockReset } from 'vitest-mock-extended';

import _useNoteTextFieldCollabEditor from '../useNoteTextFieldCollabEditor';

beforeEach(() => {
  mockReset(useNoteTextFieldCollabEditor);
});

const useNoteTextFieldCollabEditor = mockFn<typeof _useNoteTextFieldCollabEditor>();

export default useNoteTextFieldCollabEditor;
