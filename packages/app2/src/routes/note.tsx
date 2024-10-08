import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_my_layout/note')({
  component: Note,
})

function Note() {
  return (
    <>
      Note: <Outlet />
    </>
  )
}
