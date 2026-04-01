"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Sparkles, CreditCard, ChevronLeft, Zap, Shield, History, Loader2, Check, Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface UserProfileData {
  id: string
  email: string
  name: string
  credits: number
  role?: string
}

interface Transaction {
  id: string
  order_id: string
  amount: number
  credits_added: number
  status: string
  created_at: string
}

interface UserKey {
  id: string
  api_key: string
  created_at: string
  last_used_at?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [payingFor, setPayingFor] = useState<number | null>(null)
  const [billingDetails, setBillingDetails] = useState({
    full_name: '',
    mobile_number: '',
    country: '',
    state: '',
    district: '',
    street_address: ''
  })
  const [billingLoading, setBillingLoading] = useState(false)
  const [isBillingValid, setIsBillingValid] = useState(false)
  const [keys, setKeys] = useState<UserKey[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
    fetchBillingData()
    fetchKeys()
    
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const isValid = Object.values(billingDetails).every(val => val.trim().length > 0) &&
                    billingDetails.mobile_number.trim().length >= 10
    setIsBillingValid(isValid)
  }, [billingDetails])

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) {
        if (res.status === 401) router.push('/login')
        throw new Error('Failed to fetch profile data')
      }
      const data = await res.json()
      setProfile({
        ...data.profile,
        email: data.user.email,
        name: data.user.name,
        credits: data.profile?.credits || 0
      })
      setTransactions(data.transactions || [])
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/user/keys')
      const data = await res.json()
      if (data.keys) setKeys(data.keys)
    } catch (error: unknown) {
      console.error('Failed to load API keys')
    }
  }

  const fetchBillingData = async () => {
    try {
      const res = await fetch('/api/billing')
      const data = await res.json()
      if (data.billing) {
        setBillingDetails({
          full_name: data.billing.full_name || '',
          mobile_number: data.billing.mobile_number || '',
          country: data.billing.country || '',
          state: data.billing.state || '',
          district: data.billing.district || '',
          street_address: data.billing.street_address || ''
        })
      }
    } catch (error: unknown) {
      console.error('Failed to load billing info')
    }
  }

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    setBillingLoading(true)
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
        const data = await response.json()
        const address = data.address
        setBillingDetails(prev => ({
          ...prev,
          country: address.country || prev.country,
          state: address.state || address.province || prev.state,
          district: address.state_district || address.city || address.town || prev.district,
          street_address: address.suburb || address.neighbourhood || address.road || prev.street_address
        }))
        toast.success("Location auto-filled! âœ¨")
      } catch (error: unknown) {
        toast.error("Failed to detect location details")
      } finally {
        setBillingLoading(false)
      }
    }, (error) => {
      toast.error("Location access denied")
      setBillingLoading(false)
    })
  }

  const handlePurchase = async (amount: number, creditsToBuy: number) => {
    if (!isBillingValid) {
      toast.error("Please fill all billing details correctly")
      return
    }

    setPayingFor(amount)
    try {
      // 1. Save Billing Details
      const bRes = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingDetails)
      })
      const { billingId, error: bError } = await bRes.json()
      if (bError) throw new Error(bError)

      // 2. Create order
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, credits: creditsToBuy, billingId })
      })
      const { orderId } = await res.json()

      // 3. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: amount * 100, 
        currency: 'INR',
        name: 'Lanora AI',
        description: `Purchase ${creditsToBuy} credits`,
        order_id: orderId,
        handler: async function (response: { razorpay_payment_id: string; razorpay_signature: string }) {
          // 4. Verify payment
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
          })

          const data = await verifyRes.json()
          if (data.success) {
            toast.success('Payment successful â€” credits added âš¡')
            fetchUserData()
          } else {
            toast.error('Payment verification failed.')
          }
        },
        prefill: {
          email: profile?.email,
          contact: billingDetails.mobile_number,
          name: billingDetails.full_name
        },
        theme: {
          color: '#6366f1',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage || 'Failed to initiate payment')
    } finally {
      setPayingFor(null)
    }
  }

  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
           <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
            <Link href="/chat" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
                Back to Chat
            </Link>
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                 </div>
                 <span className="font-bold">Lanora AI</span>
            </div>
        </div>

        {/* User Card */}
        <div className="p-10 rounded-[48px] glass border border-white/5 relative overflow-hidden">
             {/* Glow */}
             <div className="absolute top-[-50%] right-[-10%] w-[40%] h-[100%] bg-indigo-500/10 blur-[100px]" />
             
             <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="w-24 h-24 rounded-[32px] bg-zinc-800 border border-white/10 flex items-center justify-center">
                    <History className="w-10 h-10 text-zinc-600" />
                </div>
                <div className="text-center md:text-left space-y-2 flex-grow">
                    <h1 className="text-3xl font-bold tracking-tight">Account Overview</h1>
                    <p className="text-zinc-500 font-medium">Manage your credits and subscription</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] text-center min-w-[200px]">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 block">Current Balance</span>
                     <div className="text-5xl font-bold tracking-tighter flex items-center justify-center gap-2">
                        <Zap className="w-8 h-8 text-yellow-500" />
                        {profile?.credits}
                     </div>
                </div>
             </div>
        </div>

        {/* Billing Form Section */}
        <div className="space-y-8 max-w-4xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Shield className="w-6 h-6 text-indigo-400" />
                    Billing Details
                </h2>
                <button 
                  onClick={detectLocation}
                  disabled={billingLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold transition-all"
                >
                    {billingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Use My Location ðŸ“'}
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 bg-white/5 p-8 rounded-[40px] border border-white/5">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={billingDetails.full_name}
                      onChange={(e) => setBillingDetails({...billingDetails, full_name: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Mobile Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +91 9876543210"
                      value={billingDetails.mobile_number}
                      onChange={(e) => setBillingDetails({...billingDetails, mobile_number: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Country</label>
                    <input 
                      type="text" 
                      placeholder="e.g. India"
                      value={billingDetails.country}
                      onChange={(e) => setBillingDetails({...billingDetails, country: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">State</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Maharashtra"
                      value={billingDetails.state}
                      onChange={(e) => setBillingDetails({...billingDetails, state: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">District / City</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai"
                      value={billingDetails.district}
                      onChange={(e) => setBillingDetails({...billingDetails, district: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Street Address</label>
                    <input 
                      type="text" 
                      placeholder="House No, Area, Locality"
                      value={billingDetails.street_address}
                      onChange={(e) => setBillingDetails({...billingDetails, street_address: e.target.value})}
                      className="w-full h-14 px-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                    />
                </div>
            </div>
        </div>

        {/* Pricing Options */}
        <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                Select Credit Plan
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: "Starter", price: 49, credits: 100, icon: Sparkles },
                  { name: "Popular", price: 99, credits: 250, icon: Zap, popular: true },
                  { name: "Explorer", price: 199, credits: 600, icon: Heart }
                ].map((plan, i) => (
                    <motion.div 
                        key={plan.name}
                        whileHover={{ y: -5 }}
                        className={`p-8 rounded-[40px] flex flex-col border transition-all relative ${plan.popular ? 'bg-indigo-600/5 border-indigo-500/50 shadow-2xl shadow-indigo-500/10 scale-105' : 'glass border-white/5'}`}
                    >
                        {plan.popular && (
                             <span className="absolute top-6 right-8 text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">Popular</span>
                        )}
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${plan.popular ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-indigo-400'}`}>
                            <plan.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                        <div className="text-4xl font-bold tracking-tight mb-6">â‚¹{plan.price}</div>
                        
                        <div className="space-y-4 mb-10 flex-grow">
                             <div className="flex items-center gap-3 text-sm text-zinc-400">
                                <Check className="w-4 h-4 text-green-500" />
                                {plan.credits} AI Messages
                             </div>
                             <div className="flex items-center gap-3 text-sm text-zinc-400">
                                <Check className="w-4 h-4 text-green-500" />
                                Full Mode Access
                             </div>
                        </div>

                        <button 
                          onClick={() => handlePurchase(plan.price, plan.credits)}
                          disabled={payingFor !== null || !isBillingValid}
                          className={`w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${!isBillingValid ? 'opacity-50 cursor-not-allowed bg-white/5 text-zinc-500' : plan.popular ? 'bg-white text-black hover:bg-zinc-200 shadow-lg' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                        >
                            {payingFor === plan.price ? <Loader2 className="w-5 h-5 animate-spin" /> : !isBillingValid ? 'Complete Billing Above' : 'Buy Now'}
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-8 pt-10">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                    <History className="w-6 h-6 text-zinc-500" />
                    Recent Transactions
              </h2>
              <div className="glass rounded-[32px] border border-white/5 overflow-hidden">
                   <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">
                                <tr>
                                    <th className="px-8 py-4">Transaction ID</th>
                                    <th className="px-8 py-4">Value</th>
                                    <th className="px-8 py-4">Credits Added</th>
                                    <th className="px-8 py-4">Status</th>
                                    <th className="px-8 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-10 text-center text-zinc-600 font-medium">No transactions yet.</td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-5 font-mono text-zinc-400">{t.order_id || '---'}</td>
                                            <td className="px-8 py-5 font-bold">â‚¹{t.amount}</td>
                                            <td className="px-8 py-5 text-indigo-400 font-bold">+{t.credits_added}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${t.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-zinc-500">
                                                {new Date(t.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                   </div>
              </div>
        </div>

        {/* API Key Management */}
        <div className="space-y-8 pt-10">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Zap className="w-6 h-6 text-yellow-500" />
                        API Keys (Developer)
                  </h2>
                  <button 
                    onClick={async () => {
                        const res = await fetch('/api/user/keys', { method: 'POST' })
                        const data = await res.json()
                        if (data.apiKey) {
                            toast.success('New API Key generated!')
                            fetchKeys()
                        } else {
                            toast.error(data.error || 'Failed to generate key')
                        }
                    }}
                    className="px-4 py-2 rounded-full bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
                  >
                      Generate Key
                  </button>
              </div>
              
              <div className="glass rounded-[32px] border border-white/5 overflow-hidden">
                   <div className="p-8 space-y-6">
                        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium leading-relaxed">
                            Use these keys to integrate Lanora AI into your own applications or UniversalAI plugins. 
                            Endpoint: <code className="bg-black/50 px-2 py-1 rounded ml-1">POST /api/v1/chat</code>
                        </div>

                        {keys.length === 0 ? (
                            <div className="py-10 text-center text-zinc-600 font-medium">No API keys yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {keys.map((k: UserKey) => (
                                    <div key={k.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm text-zinc-400">
                                                    {k.api_key.substring(0, 10)}...{k.api_key.substring(k.api_key.length - 4)}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(k.api_key)
                                                        toast.success('Key copied to clipboard!')
                                                    }}
                                                    className="p-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                                                Created on {new Date(k.created_at).toLocaleDateString()}
                                                {k.last_used_at && ` â€¢ Last used: ${new Date(k.last_used_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={async () => {
                                                if (confirm('Are you sure? This will immediately disable any tools using this key.')) {
                                                    const res = await fetch('/api/user/keys', {
                                                        method: 'DELETE',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ id: k.id })
                                                    })
                                                    if (res.ok) {
                                                        toast.success('Key deleted')
                                                        fetchKeys()
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Delete Key
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                   </div>
              </div>
        </div>

        {/* Security / Help */}
        <div className="grid md:grid-cols-2 gap-8 pt-12 text-center md:text-left">
             <div className="p-8 rounded-[32px] bg-zinc-900 border border-white/5 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Shield className="w-7 h-7 text-green-500" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold">Secure Payments</h4>
                    <p className="text-sm text-zinc-500">All transactions are processed securely via Razorpay with 256-bit encryption.</p>
                </div>
             </div>
             <div className="p-8 rounded-[32px] bg-zinc-900 border border-white/5 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-7 h-7 text-indigo-500" />
                </div>
                <div className="space-y-1">
                    <h4 className="font-bold">24/7 Support</h4>
                    <p className="text-sm text-zinc-500">Having trouble? Reach out to our emotional support bot or human team anytime.</p>
                </div>
             </div>
        </div>
      </div>
    </div>
  )
}


