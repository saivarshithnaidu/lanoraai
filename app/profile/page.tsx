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
    Razorpay: any;
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [payingFor, setPayingFor] = useState<number | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchUserData()

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

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
        name: data.user.name
      })
      setTransactions(data.transactions)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (amount: number, creditsToBuy: number) => {
    setPayingFor(amount)
    try {
      // 1. Create order
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, credits: creditsToBuy })
      })
      const { orderId } = await res.json()

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: amount * 100, 
        currency: 'INR',
        name: 'Lanora AI',
        description: `Purchase ${creditsToBuy} credits`,
        order_id: orderId,
        handler: async function (response: any) {
          // 3. Verify payment
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
            toast.success('Payment successful! Credits updated.')
            fetchUserData()
          } else {
            toast.error('Payment verification failed.')
          }
        },
        prefill: {
          email: profile?.email,
        },
        theme: {
          color: '#6366f1',
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (error) {
      toast.error('Failed to initiate payment')
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

        {/* Pricing Options */}
        <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                Purchase Credits
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
                        <div className="text-4xl font-bold tracking-tight mb-6">₹{plan.price}</div>
                        
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
                          disabled={payingFor !== null}
                          className={`w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${plan.popular ? 'bg-white text-black hover:bg-zinc-200 shadow-lg' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                        >
                            {payingFor === plan.price ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy Now'}
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
                                            <td className="px-8 py-5 font-bold">₹{t.amount}</td>
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
