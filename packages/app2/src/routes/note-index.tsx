import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_my_layout/note/')({
  component: NoteIndex,
})

function NoteIndex() {
  return 'Note Index'
}
