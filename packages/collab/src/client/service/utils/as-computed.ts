import { WritableDraft } from 'immer';

import { ComputedState, MutableComputedState } from '../computed-state';
import { State } from '../types';

import { castNormal } from './cast-normal';

const cache = new WeakMap<WritableDraft<State> | State, MutableComputedState>();

/**
 * @returns ComputedState for a given State
 */
export function asComputed(
  draft: WritableDraft<State>
): ComputedState<WritableDraft<State>>;
export function asComputed(draft: State): ComputedState;
export function asComputed(
  draft: WritableDraft<State> | State
): ComputedState | ComputedState<WritableDraft<State>> {
  let computedState = cache.get(draft);
  if (!computedState) {
    computedState = new MutableComputedState(castNormal(draft));
    cache.set(draft, computedState);
  }
  return computedState;
}
