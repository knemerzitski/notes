import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_root_layout/note')({
  component: Note,
})

function Note() {
  return (
    <>
      Note: <Outlet />
    </>
  )
}
