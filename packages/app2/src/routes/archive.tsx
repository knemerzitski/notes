import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_root_layout/archive')({
  component: Archive,
})

function Archive() {
  return (
    <>
      Archive: <Outlet />
    </>
  )
}
