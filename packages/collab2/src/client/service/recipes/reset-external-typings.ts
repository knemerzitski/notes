import { WritableDraft } from 'immer';

import { State } from '../types';

export function resetExternalTypings(draft: WritableDraft<State>) {
  draft.tmpRecipeResults.externalTypings = [];
}
