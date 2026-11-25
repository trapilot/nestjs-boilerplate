import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Skeleton } from '../components/ui'
import { useUser } from '../contexts/UserContext'
import { RESOURCES } from '../generated/resources'
import NotFoundPage from '../pages/NotFoundPage'
import ProfilePage from '../pages/ProfilePage'
import ResourceDetailPage from '../pages/ResourceDetailPage'
import ResourceFormPage from '../pages/ResourceFormPage'
import ResourceListPage from '../pages/ResourceListPage'
import Dashboard from '../screens/Dashboard'
import Login from '../screens/Login'

function FullPageSkeleton() {
  return (
    <div style={{ padding: 32, display: 'grid', gap: 12 }}>
      <Skeleton width={240} height={28} />
      <Skeleton height={14} />
      <Skeleton height={14} width="70%" />
    </div>
  )
}

/**
 * A component to protect routes that require authentication.
 * If the user is not authenticated, they are redirected to the /login page.
 */
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useUser()
  if (loading) return <FullPageSkeleton />
  return user ? children : <Navigate to="/login" replace />
}

/**
 * A component for public routes that redirects authenticated users.
 */
function PublicRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useUser()
  if (loading) return <FullPageSkeleton />
  return user ? <Navigate to="/dashboard" replace /> : children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />

        {RESOURCES.map((r) => [
          r.list ? (
            <Route key={`${r.key}-list`} path={r.key} element={<ResourceListPage resource={r} />} />
          ) : null,
          r.create ? (
            <Route
              key={`${r.key}-new`}
              path={`${r.key}/new`}
              element={<ResourceFormPage resource={r} mode="create" />}
            />
          ) : null,
          r.get ? (
            <Route
              key={`${r.key}-detail`}
              path={`${r.key}/:id`}
              element={<ResourceDetailPage resource={r} />}
            />
          ) : null,
          r.update ? (
            <Route
              key={`${r.key}-edit`}
              path={`${r.key}/:id/edit`}
              element={<ResourceFormPage resource={r} mode="edit" />}
            />
          ) : null,
        ])}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
