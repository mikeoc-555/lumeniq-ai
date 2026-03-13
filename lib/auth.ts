import { authClient } from './auth-client'
import { ViewType } from '@/components/auth'
import { usePostHog } from 'posthog-js/react'
import { useState, useEffect } from 'react'

type UserTeam = {
  email: string
  id: string
  name: string
  tier: string
}

// TODO: Implement team fetching with Convex
export async function getUserTeam(
  userId: string,
): Promise<UserTeam | undefined> {
  // This will be implemented when migrating teams to Convex
  return undefined
}

export function useAuth(
  setAuthDialog: (value: boolean) => void,
  setAuthView: (value: ViewType) => void,
) {
  const { data: session, isPending } = authClient.useSession()
  const [userTeam, setUserTeam] = useState<UserTeam | undefined>(undefined)
  const posthog = usePostHog()

  useEffect(() => {
    if (isPending) return

    if (session?.user) {
      getUserTeam(session.user.id).then(setUserTeam)
      posthog.identify(session.user.id, {
        email: session.user.email,
      })
      posthog.capture('sign_in')
    } else {
      // Demo mode when no auth is configured
      if (!process.env.NEXT_PUBLIC_APP_URL) {
        console.warn('Better Auth is not configured')
      }
    }
  }, [session, isPending, posthog])

  return {
    session: session ? {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }
    } : null,
    userTeam,
    isPending,
  }
}
