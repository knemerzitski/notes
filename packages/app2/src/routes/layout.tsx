import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_my_layout')({
  component: Layout,
})

function Layout() {
  return (
    <>
      Layout
      <Outlet />
      Layout
    </>
  )
}
