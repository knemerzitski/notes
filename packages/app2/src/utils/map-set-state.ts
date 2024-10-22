import { Dispatch, SetStateAction } from 'react';

export function mapSetState<T>(
  action: SetStateAction<T>,
  dispatch: Dispatch<SetStateAction<T>>,
  map: (prev: T, next: T) => T
) {
  if (typeof action === 'function') {
    //@ts-expect-error Type is valid
    const setStateFn: (prevState: T) => T = action;
    dispatch((prev) => map(prev, setStateFn(prev)));
  } else {
    dispatch((prev) => map(prev, action));
  }
}
