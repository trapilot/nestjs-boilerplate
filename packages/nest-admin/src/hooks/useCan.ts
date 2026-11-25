import { useUser } from '../contexts/UserContext'

/**
 * Returns a checker for the logged-in user's policies:
 * `can('USER', 'update')` is true when any policy group grants the action on the subject.
 */
export function useCan() {
  const { user } = useUser()

  return (subject: string, action: string): boolean => {
    if (!user?.policies) return false

    return user.policies.some((group) =>
      group.subjects?.some((s) => s.subject === subject && s.actions?.includes(action)),
    )
  }
}
