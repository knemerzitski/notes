import { useLayoutEffect, useRef } from 'react';

export type ControlledInputSelectionProps = Pick<
  HTMLInputElement,
  'value' | 'selectionStart' | 'selectionEnd' | 'selectionDirection'
>;

/**
 *
 * Input selection is updated with given values whenever value changes.
 */
export default function useControlledInputSelection({
  selectionStart,
  selectionEnd,
  selectionDirection,
  value,
}: ControlledInputSelectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (inputRef.current == null) return;

    const input = inputRef.current;

    input.setSelectionRange(
      selectionStart ?? input.selectionStart,
      selectionEnd ?? input.selectionEnd,
      selectionDirection ?? input.selectionDirection ?? undefined
    );
  }, [selectionStart, selectionEnd, selectionDirection, value]);

  return inputRef;
}
