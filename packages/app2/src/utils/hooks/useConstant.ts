import { useRef } from 'react';
import { ExcludeUndefined } from '~utils/types';

/**
 * Use for variables which are only computed once.
 */
export function useConstant<T>(
  initializer: () => ExcludeUndefined<T>
): ExcludeUndefined<T> {
  const ref = useRef<ExcludeUndefined<T> | undefined>();

  if (ref.current === undefined) {
    ref.current = initializer();
  }

  return ref.current;
}
