import { ReactNode } from 'react';
import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { useNoteId } from '../context/note-id';
import {
  AnyRouter,
  Navigate,
  NavigateOptions,
  RegisteredRouter,
} from '@tanstack/react-router';

const RedirectNoteNotFound_Query = gql(`
  query RedirectNoteNotFound_Query($by: UserNoteLinkByInput!){
    userNoteLink(by: $by){
      id
    }
  }
`);

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

  const { data, loading } = useQuery(RedirectNoteNotFound_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      by: {
        noteId,
      },
    },
  });

  if (loading) {
    return null;
  }

  if (!data) {
    // @ts-expect-error Type hints work outside this component
    return <Navigate {...navigateOptions} />;
  }

  return children;
}
