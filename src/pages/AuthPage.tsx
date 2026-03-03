interface AuthPageProps {
  signIn: () => Promise<void>
  authError: string | null
}

export function AuthPage({ signIn, authError }: AuthPageProps) {
  return (
    <div className="min-h-screen bg-x-bg flex">
      {/* Left — decorative */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-x-blue/5">
        <svg viewBox="0 0 24 24" className="w-64 h-64 fill-x-blue/20" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-x-text" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-x-text text-4xl font-black tracking-tight">
              Track your X growth
            </h1>
            <p className="text-x-muted text-lg">
              Set goals. Build streaks. Earn badges.
            </p>
          </div>

          {/* Features list */}
          <div className="space-y-3">
            {[
              { icon: '🎯', text: 'Set daily reply and tweet goals' },
              { icon: '🔥', text: 'Build consecutive day streaks' },
              { icon: '📬', text: 'Track and clear received replies' },
              { icon: '🏆', text: 'Earn badges at milestones' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-x-text">{text}</span>
              </div>
            ))}
          </div>

          {/* Sign in button */}
          <div className="space-y-3">
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 bg-x-text text-black font-bold py-3.5 rounded-full hover:bg-x-text/90 transition-colors disabled:opacity-50 text-lg"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Sign in with X
            </button>

            {authError && (
              <p className="text-red-500 text-sm text-center px-4 py-2 bg-red-500/10 rounded-lg break-words">
                {authError}
              </p>
            )}

            <p className="text-x-muted text-xs text-center leading-relaxed px-4">
              By signing in, you agree to grant XG Tracker read access to your X activity.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
