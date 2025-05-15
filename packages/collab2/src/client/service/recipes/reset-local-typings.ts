import { WritableDraft } from 'immer';
import { State } from '../types';

export function resetLocalTypings(draft: WritableDraft<State>) {
  draft.tmpRecipeResults.localTypings = [];
}
