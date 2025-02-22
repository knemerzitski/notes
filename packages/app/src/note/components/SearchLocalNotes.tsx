import { useQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import { ComponentType, ReactNode, useMemo } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { PassChildren } from '../../utils/components/PassChildren';
import { useLogger } from '../../utils/context/logger';
import { NoteIdsProvider } from '../context/note-ids';

import { NoteCard } from './NoteCard';
import { NotesCardGrid } from './NotesCardGrid';

import { SearchResultIconText } from './SearchResultIconText';
import Fuse from 'fuse.js';

const SearchLocalNotes_Query = gql(`
  query SearchLocalNotes_Query($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
      id
      allNoteLinks {
        id
        note {
          id
          collabService
        }
        excludeFromConnection
        ...NotesCardGrid_UserNoteLinkFragment
      }
    }
  }
`);

export function SearchLocalNotes({
  searchText = '',
  NoListComponent = PassChildren,
}: {
  searchText?: string;
  /**
   * Wrapper component when search has no results or no searchText
   */
  NoListComponent?: ComponentType<{ children: ReactNode }>;
}) {
  const logger = useLogger('SearchLocalNotes');

  searchText = searchText.trim();

  const userId = useUserId();

  const { data, error } = useQuery(SearchLocalNotes_Query, {
    variables: {
      userBy: {
        id: userId,
      },
    },
    fetchPolicy: 'cache-only',
  });

  const fuse = useMemo(() => {
    if (!data) {
      return;
    }
    const itemsForFuse = data.signedInUser.allNoteLinks
      //  TODO reusable util for excluding...
      .filter((noteLink) => !noteLink.excludeFromConnection)
      .map((noteLink) => {
        const text = noteLink.note.collabService.viewText;

        return {
          text,
          noteId: noteLink.note.id,
        };
      });

    const fuse = new Fuse(itemsForFuse, {
      keys: ['text'],
    });

    return fuse;
  }, [data]);

  const noteIds = useMemo(() => {
    if (!fuse) {
      return [];
    }

    const searchResult = fuse.search(searchText);
    searchResult.reverse();

    const seenIds = new Set<string>();

    return searchResult
      .map(({ item }) => item.noteId)
      .filter((noteId) => {
        if (seenIds.has(noteId)) {
          logger?.error('noteLink:filteredDuplicateId', {
            noteId,
          });
          return false;
        }
        seenIds.add(noteId);
        return true;
      });
  }, [fuse, searchText, logger]);

  if (error) {
    // TODO reuse
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (searchText === '') {
    logger?.debug('startTyping');
    // TODO reuse
    return (
      <NoListComponent>
        <SearchResultIconText text="Start typing to search notes" />
      </NoListComponent>
    );
  }

  if (noteIds.length === 0) {
    // TODO reuse
    logger?.debug('noMatch');
    return (
      <NoListComponent>
        <SearchResultIconText text={'No matching notes'} />
      </NoListComponent>
    );
  }

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <NotesCardGrid noteCard={<NoteCard />} />
    </NoteIdsProvider>
  );
}
