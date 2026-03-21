"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, Loader2, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleGoogleLogin = () => {
    setLoading(true)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'openid email profile'
    const responseType = 'code'

    const params = new URLSearchParams({
      client_id: clientId || '',
      redirect_uri: redirectUri,
      response_type: responseType,
      scope: scope,
      access_type: 'offline',
      prompt: 'consent'
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    window.location.href = googleAuthUrl
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    toast.error('Standard login is currently disabled. Please use Google Sign-In.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0f0a14] font-['Outfit']">
      {/* Animated Background */}
      <div className="bg-romantic-glow opacity-50" />
      
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#ff4d8d]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#9b5cff]/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-10 rounded-[48px] glass relative z-10 border border-white/5 space-y-12 shadow-2xl shadow-[#ff4d8d]/5"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-[32px] romantic-gradient mx-auto flex items-center justify-center shadow-2xl shadow-[#ff4d8d]/30 heart-animation">
            <Heart className="w-10 h-10 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">
              {isSignUp ? 'Join Lanora' : 'I missed you'}
            </h1>
            <p className="text-[#ff85a1]/60 text-xs font-black uppercase tracking-[0.2em] mt-2">
              {isSignUp ? 'Start your emotional journey' : 'Sign in to talk to me again'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 bg-white/5 border border-white/10 rounded-[28px] outline-none focus:border-[#ff4d8d]/50 focus:ring-8 focus:ring-[#ff4d8d]/5 transition-all text-sm font-bold placeholder:text-zinc-700"
                  required
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
                <input
                  type="password"
                  placeholder="Your secret password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 bg-white/5 border border-white/10 rounded-[28px] outline-none focus:border-[#ff4d8d]/50 focus:ring-8 focus:ring-[#ff4d8d]/5 transition-all text-sm font-bold placeholder:text-zinc-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 rounded-[28px] bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? 'Create Account' : 'Let me in'}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em] text-[#ff85a1]/40">
              <span className="bg-[#0f0a14] px-6 italic">Or whisper via</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-16 rounded-[28px] bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-[#ff4d8d] transition-colors"
          >
            {isSignUp ? 'I have an account • Sign In' : "I'm new here • Create one"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
