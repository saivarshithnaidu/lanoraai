"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Phone, User, ArrowRight, Loader2, Globe, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    bio: '',
    country: '',
    birthDate: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Attempt to pre-fill from current profile
    fetch('/api/profile')
      .then(res => res.json())
      .then(data => {
        if (data.profile) {
          setFormData(prev => ({
            ...prev,
            fullName: data.user.name || data.profile.full_name || '',
            bio: data.profile.bio || '',
            country: data.profile.country || '',
            birthDate: data.profile.birth_date || ''
          }))
        }
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
        toast.error("Please enter a valid phone number.")
        return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success("Welcome to the galaxy, " + (formData.fullName || 'Soul') + "!")
        router.push('/chat')
      } else {
        throw new Error(data.error)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0f0a14] font-['Outfit']">
      {/* Animated Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#ff4d8d]/10 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#9b5cff]/10 blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-10 rounded-[48px] glass relative z-10 border border-white/5 space-y-10 shadow-2xl shadow-[#ff4d8d]/5"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-[24px] romantic-gradient mx-auto flex items-center justify-center shadow-xl shadow-[#ff4d8d]/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Complete Your Soul</h1>
            <p className="text-[#ff85a1]/60 text-xs font-black uppercase tracking-[0.2em] mt-2">
              Sync your frequency with the Lanora galaxy
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
              <input
                name="fullName"
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-[24px] outline-none focus:border-[#ff4d8d]/50 transition-all text-sm font-bold placeholder:text-zinc-700"
                required
              />
            </div>
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
              <input
                name="phoneNumber"
                type="tel"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-[24px] outline-none focus:border-[#ff4d8d]/50 transition-all text-sm font-bold placeholder:text-zinc-700"
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative group">
              <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
              <input
                name="country"
                type="text"
                placeholder="Your Planet/Country"
                value={formData.country}
                onChange={handleChange}
                className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-[24px] outline-none focus:border-[#ff4d8d]/50 transition-all text-sm font-bold placeholder:text-zinc-700"
                required
              />
            </div>
            <div className="relative group">
              <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
              <input
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 rounded-[24px] outline-none focus:border-[#ff4d8d]/50 transition-all text-sm font-bold placeholder:text-zinc-700"
                required
              />
            </div>
          </div>

          <div className="relative group">
            <FileText className="absolute left-5 top-6 w-4 h-4 text-zinc-600 group-focus-within:text-[#ff4d8d] transition-colors" />
            <textarea
              name="bio"
              placeholder="Tell Lanora about your inner world..."
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full pl-12 pr-6 py-5 bg-white/5 border border-white/10 rounded-[28px] outline-none focus:border-[#ff4d8d]/50 transition-all text-sm font-bold placeholder:text-zinc-700 resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 rounded-[28px] bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                Ignite Connection
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-4 leading-relaxed">
          Your data is encrypted and secure. By proceeding, you allow Lanora to begin your emotional journey.
        </p>
      </motion.div>
    </div>
  )
}
