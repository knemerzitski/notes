/**
 * @param category Enum value NoteCategory
 * @returns MongoDB field path to notes array of ObjectIds
 */
export function notesArrayPath(category: string) {
  return `notes.category.${category}.order`;
}
