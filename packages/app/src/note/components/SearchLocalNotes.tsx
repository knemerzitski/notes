import { useQuery } from '@apollo/client';
import { Alert } from '@mui/material';
import Fuse from 'fuse.js';
import { ComponentType, ReactNode, useMemo } from 'react';

import { gql } from '../../__generated__';
import { useUserId } from '../../user/context/user-id';
import { PassChildren } from '../../utils/components/PassChildren';
import { useLogger } from '../../utils/context/logger';
import { NoteIdsProvider } from '../context/note-ids';

import { NoteCard } from './NoteCard';
import { NotesCardGrid } from './NotesCardGrid';
import { SearchNoMatchIconText } from './SearchNoMatchIconText';
import { SearchStartTypingIconText } from './SearchStartTypingIconText';

const SearchLocalNotes_Query = gql(`
  query SearchLocalNotes_Query($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
      id
      allNoteLinks {
        id
        viewText
        note {
          id
        }
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

    const itemsForFuse = data.signedInUser.allNoteLinks.map((noteLink) => {
      return {
        text: noteLink.viewText,
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
    return (
      <Alert severity="error" elevation={0}>
        {error.message}
      </Alert>
    );
  }

  if (searchText === '') {
    logger?.debug('startTyping');
    return (
      <NoListComponent>
        <SearchStartTypingIconText />
      </NoListComponent>
    );
  }

  if (noteIds.length === 0) {
    logger?.debug('noMatch');
    return (
      <NoListComponent>
        <SearchNoMatchIconText />
      </NoListComponent>
    );
  }

  return (
    <NoteIdsProvider noteIds={noteIds}>
      <NotesCardGrid noteCard={<NoteCard />} />
    </NoteIdsProvider>
  );
}
