import { MovableNoteCategory, NoteCategory } from '../../__generated__/graphql';

export function toMovableNoteCategory(
  category: NoteCategory
): MovableNoteCategory | undefined {
  switch (category) {
    case NoteCategory.DEFAULT:
      return MovableNoteCategory.DEFAULT;
    case NoteCategory.ARCHIVE:
      return MovableNoteCategory.ARCHIVE;
    case NoteCategory.STICKY:
      return MovableNoteCategory.STICKY;
  }

  return;
}

export function toNoteCategory(category: MovableNoteCategory): NoteCategory {
  switch (category) {
    case MovableNoteCategory.DEFAULT:
      return NoteCategory.DEFAULT;
    case MovableNoteCategory.ARCHIVE:
      return NoteCategory.ARCHIVE;
    case MovableNoteCategory.STICKY:
      return NoteCategory.STICKY;
  }
}
