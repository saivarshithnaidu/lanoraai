import { createAdminClient } from '@/lib/supabase/server'
import { CreditCard, User, Calendar, IndianRupee, ChevronDown, CheckCircle2, TrendingUp } from 'lucide-react'

export default async function AdminPaymentsPage() {
  const supabase = await createAdminClient()
  const { data: payments } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const totalRevenue = payments?.filter(p => p.status === 'success').reduce((acc, curr) => acc + curr.amount, 0) || 0

  return (
    <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Payment Dashboard</h1>
                <p className="text-zinc-500 font-medium">Tracking revenue and credit transactions</p>
            </div>
            <div className="bg-indigo-600 p-6 rounded-[32px] flex items-center gap-6 shadow-2xl shadow-indigo-600/20">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest block mb-1">Total Verified Revenue</span>
                    <div className="text-3xl font-bold text-white tracking-tighter">₹{totalRevenue.toLocaleString()}</div>
                 </div>
            </div>
        </header>

        <div className="space-y-6">
            <div className="flex items-center justify-between px-6 py-4 rounded-2xl border border-white/5 bg-white/5 mb-8">
                 <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Payment Lifecycle</span>
                    <span className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-green-500" /> High Activity</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    Sort: Newest First <ChevronDown className="w-4 h-4" />
                 </div>
            </div>

            <div className="grid gap-6">
                {payments?.length === 0 ? (
                    <div className="p-20 text-center glass rounded-[48px] border border-white/5 opacity-50 font-medium">No payments recorded yet.</div>
                ) : (
                    payments?.map((payment) => (
                        <div key={payment.id} className="p-8 rounded-[40px] glass border border-white/5 hover:bg-white/5 transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 pt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
                                <Calendar className="w-3 h-3" /> {new Date(payment.created_at).toLocaleString()}
                             </div>
                             
                             <div className="flex items-start gap-8 relative z-10">
                                <div className={`w-16 h-16 rounded-[28px] border flex items-center justify-center shrink-0 transition-all ${payment.status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                                    <IndianRupee className="w-8 h-8" />
                                </div>
                                <div className="space-y-4 flex-grow">
                                     <div className="flex items-center gap-3">
                                         <div className={`px-3 py-1 rounded-full font-bold text-[10px] border uppercase ${payment.status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>
                                            {payment.status === 'success' ? 'VERIFIED' : 'PENDING'}
                                         </div>
                                         <span className="text-zinc-600 font-mono text-xs">Transaction ID: {payment.order_id || 'N/A'}</span>
                                     </div>
                                     <h3 className="text-2xl font-bold tracking-tight">₹{payment.amount} <span className="text-sm font-medium text-zinc-500">for {payment.credits_added} Credits</span></h3>
                                     <div className="flex items-center gap-6 mt-4">
                                         <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <User className="w-4 h-4" /> User ID: {payment.user_id?.substring(0, 13)}...
                                         </div>
                                         <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <CreditCard className="w-4 h-4" /> Method: Razorpay
                                         </div>
                                     </div>
                                </div>
                                <div className="flex flex-col items-end justify-center self-center pr-4">
                                    {payment.status === 'success' && <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-green-500" /></div>}
                                </div>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  )
}
