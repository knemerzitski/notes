import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_root_layout/note/')({
  component: NoteIndex,
})

function NoteIndex() {
  return 'Note Index'
}
