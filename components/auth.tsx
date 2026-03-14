import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import * as SimpleIcons from 'simple-icons'

const VIEWS = {
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  FORGOTTEN_PASSWORD: 'forgotten_password',
  MAGIC_LINK: 'magic_link',
  UPDATE_PASSWORD: 'update_password',
} as const

export type ViewType = (typeof VIEWS)[keyof typeof VIEWS]

type RedirectTo = undefined | string

export interface AuthProps {
  socialLayout?: 'horizontal' | 'vertical'
  providers?: ('github' | 'google')[]
  view?: ViewType
  redirectTo?: RedirectTo
  onlyThirdPartyProviders?: boolean
  magicLink?: boolean
  onSignUpValidate?: (email: string, password: string) => Promise<boolean>
  metadata?: Record<string, any>
}

interface UseAuthFormReturn {
  loading: boolean
  error: string | null
  message: string | null
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setMessage: (message: string | null) => void
  clearMessages: () => void
}

const ProviderIcons: {
  [key in 'github' | 'google']?: React.ComponentType<{ className?: string }>
} = {
  github: ({ className }) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: SimpleIcons.siGithub.svg }}
    />
  ),
  google: ({ className }) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      dangerouslySetInnerHTML={{ __html: SimpleIcons.siGoogle.svg }}
    />
  ),
}

function useAuthForm(): UseAuthFormReturn {
  const [loading, setLoading] = useState(false)
  const [error, setErrorState] = useState<string | null>(null)
  const [message, setMessageState] = useState<string | null>(null)

  const setError = useCallback((errorMsg: string | null) => {
    setErrorState(errorMsg)
    if (errorMsg) setMessageState(null)
  }, [])

  const setMessage = useCallback((msg: string | null) => {
    setMessageState(msg)
    if (msg) setErrorState(null)
  }, [])

  const clearMessages = useCallback(() => {
    setErrorState(null)
    setMessageState(null)
  }, [])

  return {
    loading,
    error,
    message,
    setLoading,
    setError,
    setMessage,
    clearMessages,
  }
}

interface SocialAuthProps {
  providers: ('github' | 'google')[]
  layout?: 'horizontal' | 'vertical'
  redirectTo?: RedirectTo
  setLoading: (loading: boolean) => void
  setError: (error: string) => void
  clearMessages: () => void
  loading: boolean
}

function SocialAuth({
  providers,
  layout = 'vertical',
  redirectTo,
  setLoading,
  setError,
  clearMessages,
  loading,
}: SocialAuthProps) {
  const handleProviderSignIn = async (provider: 'github' | 'google') => {
    clearMessages()
    setLoading(true)
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: redirectTo,
      })
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with provider')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'space-y-3',
        layout === 'horizontal' && 'flex space-y-0 space-x-3',
      )}
    >
      {providers.map((provider) => {
        const IconComponent = ProviderIcons[provider]
        const providerName =
          provider.charAt(0).toUpperCase() + provider.slice(1)
        return (
          <Button
            key={provider}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => handleProviderSignIn(provider)}
            disabled={loading}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            {layout === 'vertical'
              ? `Continue with ${providerName}`
              : providerName}
          </Button>
        )
      })}
    </div>
  )
}

interface SubComponentProps {
  setAuthView: (view: ViewType) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setMessage: (message: string | null) => void
  clearMessages: () => void
  loading: boolean
  redirectTo?: RedirectTo
}

interface SignInFormProps extends SubComponentProps {
  magicLink?: boolean
}

function SignInForm({
  setAuthView,
  setLoading,
  setError,
  clearMessages,
  loading,
}: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      })
      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form id="auth-sign-in" onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button
            variant="link"
            type="button"
            onClick={() => setAuthView(VIEWS.FORGOTTEN_PASSWORD)}
            className="p-0 h-auto font-normal text-muted-foreground text-sm"
          >
            Forgot your password?
          </Button>
        </div>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10"
            autoComplete="current-password"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  )
}

interface SignUpFormProps extends SubComponentProps {
  onSignUpValidate?: (email: string, password: string) => Promise<boolean>
  metadata?: Record<string, any>
}

function SignUpForm({
  setAuthView,
  setLoading,
  setError,
  setMessage,
  clearMessages,
  loading,
  redirectTo,
  onSignUpValidate,
  metadata,
}: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      if (onSignUpValidate) {
        const isValid = await onSignUpValidate(email, password)
        if (!isValid) {
          throw new Error(
            'Invalid email address. Please use a different email.',
          )
        }
      }
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: email.split('@')[0], // Default name from email
        callbackURL: redirectTo,
      })
      if (error) throw error
      setMessage('Check your email for the confirmation link.')
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form id="auth-sign-up" onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign Up
      </Button>
    </form>
  )
}

function ForgottenPassword({
  setLoading,
  setError,
  setMessage,
  clearMessages,
  loading,
}: Omit<SubComponentProps, 'setAuthView' | 'redirectTo'>) {
  const [email, setEmail] = useState('')

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      // Use type assertion since better-auth client methods are dynamically generated
      const { error } = await (authClient as any).forgetPassword({
        email,
        redirectTo: window.location.origin + '/reset-password',
      })
      if (error) throw error
      setMessage('Check your email for password reset instructions.')
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      id="auth-forgot-password"
      onSubmit={handlePasswordReset}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="pl-10"
            autoComplete="email"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Send Reset Instructions
      </Button>
    </form>
  )
}

function UpdatePassword({
  setLoading,
  setError,
  setMessage,
  clearMessages,
  loading,
}: Omit<
  SubComponentProps,
  'setAuthView' | 'redirectTo'
>) {
  const [password, setPassword] = useState('')

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    clearMessages()
    setLoading(true)
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
      })
      if (error) throw error
      setMessage('Password updated successfully.')
      setPassword('')
    } catch (error: any) {
      setError(error.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      id="auth-update-password"
      onSubmit={handlePasswordUpdate}
      className="space-y-4"
    >
      <h3 className="text-lg font-semibold">Update Password</h3>
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="new-password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pl-10"
            autoComplete="new-password"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update Password
      </Button>
    </form>
  )
}

function Auth({
  socialLayout = 'vertical',
  providers,
  view = VIEWS.SIGN_IN,
  redirectTo,
  onlyThirdPartyProviders = false,
  magicLink = false,
  onSignUpValidate,
  metadata,
}: AuthProps): JSX.Element | null {
  const [authView, setAuthView] = useState<ViewType>(view)
  const {
    loading,
    error,
    message,
    setLoading,
    setError,
    setMessage,
    clearMessages,
  } = useAuthForm()

  useEffect(() => {
    setAuthView(view)
    setError(null)
    setMessage(null)
  }, [view, setError, setMessage])

  const setAuthViewAndClearMessages = useCallback(
    (newView: ViewType) => {
      setAuthView(newView)
      setError(null)
      setMessage(null)
    },
    [setError, setMessage],
  )

  const commonProps = {
    setAuthView: setAuthViewAndClearMessages,
    setLoading,
    setError,
    setMessage,
    clearMessages,
    loading,
    redirectTo,
  }

  let viewComponent: React.ReactNode = null

  switch (authView) {
    case VIEWS.SIGN_IN:
      viewComponent = <SignInForm {...commonProps} />
      break
    case VIEWS.SIGN_UP:
      viewComponent = (
        <SignUpForm
          {...commonProps}
          onSignUpValidate={onSignUpValidate}
          metadata={metadata}
        />
      )
      break
    case VIEWS.FORGOTTEN_PASSWORD:
      viewComponent = <ForgottenPassword {...commonProps} />
      break
    case VIEWS.UPDATE_PASSWORD:
      viewComponent = <UpdatePassword {...commonProps} />
      break
    default:
      viewComponent = null
  }

  const showSocialAuth = providers && providers.length > 0
  const showSeparator = showSocialAuth && !onlyThirdPartyProviders

  return (
    <div className="w-full space-y-4">
      {authView === VIEWS.UPDATE_PASSWORD ? (
        viewComponent
      ) : (
        <>
          {showSocialAuth && (
            <SocialAuth
              providers={providers || []}
              layout={socialLayout}
              redirectTo={redirectTo}
              setLoading={setLoading}
              setError={setError}
              clearMessages={clearMessages}
              loading={loading}
            />
          )}
          {showSeparator && (
            <div className="relative my-4">
              <div className="absolute inset-0 flex items">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}
          {!onlyThirdPartyProviders && viewComponent}
        </>
      )}

      {!onlyThirdPartyProviders && authView !== VIEWS.UPDATE_PASSWORD && (
        <div className="text-center text-sm space-y-1 mt-4">
          {authView === VIEWS.SIGN_IN && (
            <>
              <p className="text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Button
                  variant="link"
                  type="button"
                  onClick={() => setAuthViewAndClearMessages(VIEWS.SIGN_UP)}
                  className="p-0 h-auto underline"
                >
                  Sign up
                </Button>
              </p>
            </>
          )}
          {authView === VIEWS.SIGN_UP && (
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Button
                variant="link"
                type="button"
                onClick={() => setAuthViewAndClearMessages(VIEWS.SIGN_IN)}
                className="p-0 h-auto underline"
              >
                Sign in
              </Button>
            </p>
          )}
          {authView === VIEWS.FORGOTTEN_PASSWORD && (
            <Button
              variant="link"
              type="button"
              onClick={() => setAuthViewAndClearMessages(VIEWS.SIGN_IN)}
              className="p-0 h-auto underline"
            >
              Back to Sign In
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert variant="default">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

export default Auth
