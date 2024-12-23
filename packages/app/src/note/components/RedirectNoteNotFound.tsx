import {
  AnyRouter,
  Navigate,
  NavigateOptions,
  RegisteredRouter,
} from '@tanstack/react-router';
import { ReactNode } from 'react';

import { useNoteId } from '../context/note-id';
import { useNoteExists } from '../hooks/useNoteExists';

/**
 * Navigates to provided path when noteId in context doesn't exists.
 * Otherwisre renders `children`.
 */
export function RedirectNoteNotFound<
  TRouter extends AnyRouter = RegisteredRouter,
  TFrom extends string = string,
  TTo extends string | undefined = '.',
  TMaskFrom extends string = TFrom,
  TMaskTo extends string = '.',
>({
  children,
  navigateOptions,
}: {
  navigateOptions: NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>;
  children: ReactNode;
}) {
  const noteId = useNoteId();

  const noteExists = useNoteExists(noteId);

  if (noteExists === null) {
    return null;
  }

  if (!noteExists) {
    // @ts-expect-error Type hints work outside this component
    return <Navigate {...navigateOptions} />;
  }

  return children;
}
