/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import mapObject from 'map-obj';

import { isPlainObject } from '../../../../../utils/src/type-guards/is-plain-object';

import { ComputedState, MutableComputedState } from '../computed-state';
import { InvalidStateCollabServiceError } from '../errors';
import { Service } from '../service';

import { State } from '../types';

import { asComputed } from './as-computed';
import { assertValidState } from './assert-valid-state';


declare module '../computed-state' {
  interface MutableComputedState {
    getDebugObject(this: ComputedState): DebugObject;
  }
}

type DebugObject = State & {
  computed: Pick<ComputedState, (typeof COMPUTED_STATE_PROPERTIES)[number]>;
};

const COMPUTED_STATE_PROPERTIES = [
  'viewText',
  'submittedChanges',
  'haveLocalChanges',
  'haveSubmittedChanges',
  'haveChanges',
  'canSubmitChanges',
  'canUndo',
  'canRedo',
  'historySize',
] as const;

// @ts-expect-error Modify private method for debugging purposes
const _setNextState = Service.prototype.setNextState;

/**
 * When enabled every state change is logged and throws error on invalid state modification.
 * @default false
 */
export function setStateDebugging(
  enable: boolean,
  options?: {
    /**
     * @default debug
     */
    logLevel?: 'debug' | 'error';
    /**
     * @default true
     */
    assertValidState?: boolean;
    /**
     * @default all
     */
    logProperties?: 'all' | 'state';
  }
) {
  defineGetDebugObject(enable, options);
  overrideSetNextState(enable, options);
}

function defineGetDebugObject(
  enable: boolean,
  options?: Parameters<typeof setStateDebugging>[1]
) {
  if (enable) {
    const logProperties = options?.logProperties ?? 'all';
    const includeProps = logProperties === 'all' ? COMPUTED_STATE_PROPERTIES : [];

    // @ts-expect-error Don't need accurate typing for debugging
    MutableComputedState.prototype.getDebugObject = function () {
      return {
        computed: objectProperties(this, MutableComputedState.prototype, includeProps),
        ...this.state,
      };
    };
  } else {
    // @ts-expect-error Typing doesn't matter when not enabled
    MutableComputedState.prototype.getDebugObject = function () {
      // Do nothing
    };
  }
}

function overrideSetNextState(
  enable: boolean,
  options?: Parameters<typeof setStateDebugging>[1]
) {
  if (enable) {
    const logLevel = options?.logLevel ?? 'debug';
    const optionAssertValidState = options?.assertValidState ?? true;
    // @ts-expect-error Modify private method for debugging purposes
    Service.prototype.setNextState = function (nextState) {
      const nextDebugObject = asComputed(nextState).getDebugObject();

      if (this.computedState.state === nextState) {
        return;
      }

      try {
        if (optionAssertValidState) {
          assertValidState(nextState);
        }
        _setNextState.call(this, nextState);

        if (logLevel === 'debug') {
          this.logger?.debug('\x1b[4mcomputedState\x1b[0m', nextDebugObject);
        }
      } catch (err) {
        this.logger?.error('\x1b[4mcomputedState\x1b[0m', {
          current: this.computedState.getDebugObject(),
          illegal: nextDebugObject,
        });
        throw new InvalidStateCollabServiceError(
          `Attempted illegal state modification${err instanceof Error ? `: ${err.message}` : ''}`,
          {
            cause: err,
          }
        );
      }
    };
  } else {
    // @ts-expect-error Modify private method for debugging purposes
    Service.prototype.setNextState = _setNextState;
  }
}

function catchErr<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch (err) {
    return err instanceof Error ? err.message : 'error';
  }
}

function objectProperties(
  target: object,
  value: object,
  includeNames: readonly string[]
) {
  return Object.entries(Object.getOwnPropertyDescriptors(value)).reduce<
    Record<string, any>
  >((result, [name, desc]) => {
    if (!includeNames.includes(name)) {
      return result;
    }

    const value = desc.get ?? desc.value;

    result[name] = catchErr(() =>
      enumerateArrays(typeof value === 'function' ? value.call(target) : value)
    );

    return result;
  }, {});
}

function enumerateArrays(value: any): any {
  if (Array.isArray(value)) {
    return value.map((v, i) => [i, v]);
  }

  if (isPlainObject(value)) {
    // @ts-expect-error Ignore typing
    return mapObject(value, (key, value) => [key, enumerateArrays(value)]);
  }

  return value;
}
