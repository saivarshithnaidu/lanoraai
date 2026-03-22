"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  MessageSquare, 
  Search, 
  Zap,
  Globe,
  Clock,
  Mail,
  Phone,
  ArrowRight,
  ShieldAlert,
  History,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  ZapOff
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'souls' | 'pulse' | 'audit'

export default function AdminOmniscence() {
    const [activeTab, setActiveTab] = useState<Tab>('souls')
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({ totalSouls: 0, liveMessages: 0, energyUsed: 0 })

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        
        // Live Monitoring Subscription
        const channel = supabase
            .channel('admin_pulse')
            .on('postgres_changes', { event: 'INSERT', table: 'chat_logs', schema: 'public' }, (payload) => {
                setLogs(prev => [payload.new, ...prev].slice(0, 50))
                setStats(prev => ({ ...prev, liveMessages: prev.liveMessages + 1 }))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeTab, search])

    const fetchData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'souls') {
                let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
                if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`)
                const { data } = await query.limit(50)
                setUsers(data || [])
            } else {
                const { data } = await supabase.from('chat_logs').select('*, profiles(name, email)').order('created_at', { ascending: false }).limit(50)
                setLogs(data || [])
            }
            
            // Fetch Pulse Stats
            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
            const { count: mCount } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true })
            setStats({ totalSouls: uCount || 0, liveMessages: mCount || 0, energyUsed: 0 })
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (userId: string, action: string) => {
        if (action === 'block') {
            await supabase.from('profiles').update({ is_blocked: true }).eq('id', userId)
            toast.success("Soul disconnected from the matrix.")
        } else if (action === 'reset') {
            await supabase.from('profiles').update({ credits: 100 }).eq('id', userId)
            toast.success("Energy reserve restored to 100%.")
        }
        fetchData()
    }

    return (
        <div className="space-y-12">
            {/* Header / Command Pulse */}
            <div className="grid md:grid-cols-3 gap-6">
                <PulseCard icon={Users} label="Total Souls" value={stats.totalSouls} color="pink" />
                <PulseCard icon={MessageSquare} label="Synapse History" value={stats.liveMessages} color="purple" />
                <PulseCard icon={ShieldCheck} label="Guardian Status" value="Online" color="green" />
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white/5 p-1.5 rounded-[24px] w-fit border border-white/5">
                <TabBtn active={activeTab==='souls'} label="Soul Registry" onClick={()=>setActiveTab('souls')} />
                <TabBtn active={activeTab==='audit'} label="Chat Audit (Live)" onClick={()=>setActiveTab('audit')} />
            </div>

            {/* Main Registry View */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[48px] border border-white/10 overflow-hidden shadow-2xl"
            >
                <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{activeTab === 'souls' ? 'Identity Database' : 'Neural Conversation Audit'}</h2>
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-pink-400" />
                        <input 
                            value={search}
                            onChange={(e)=>setSearch(e.target.value)}
                            placeholder="Search identities..." 
                            className="bg-zinc-900/50 border border-white/5 h-14 pl-14 pr-8 rounded-[28px] outline-none focus:border-pink-500/40 w-full md:w-80 text-sm font-bold transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'souls' ? (
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.03] text-[10px] uppercase font-black tracking-[0.3em] text-zinc-500">
                                <tr>
                                    <th className="px-10 py-8">Identity</th>
                                    <th className="px-8 py-8">Connectivity & Origin</th>
                                    <th className="px-8 py-8 text-center">Energy Reserve</th>
                                    <th className="px-10 py-8 text-right">Shield Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05]">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="font-black text-[16px] text-white tracking-tight">{u.name || 'Anonymous'}</div>
                                            <div className="text-[10px] text-zinc-600 font-black uppercase mt-1 tracking-widest">{u.email}</div>
                                            <div className="text-[10px] text-zinc-700 font-bold mt-1.5 flex items-center gap-2"><Phone className="w-3 h-3 text-pink-500/40" /> {u.phone_number || 'No link recorded'}</div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[11px] font-black text-zinc-400 italic"><Clock className="w-3.5 h-3.5 text-pink-500/50" /> {u.last_login ? `In: ${new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never'} • {u.last_logout ? `Out: ${new Date(u.last_logout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Active'}</div>
                                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2"><Globe className="w-3 h-3" /> IP: {u.ip_address || 'Encrypted'}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <div className="text-2xl font-black italic text-pink-400 tracking-tighter">{u.credits} ⚡</div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={()=>handleAction(u.id, 'reset')} className="p-3.5 bg-white/5 rounded-2xl text-zinc-600 hover:text-pink-400 hover:bg-pink-500/5 transition-all"><History className="w-4.5 h-4.5"/></button>
                                                <button onClick={()=>handleAction(u.id, 'block')} className="p-3.5 bg-white/5 rounded-2xl text-zinc-600 hover:text-red-500 hover:bg-red-500/5 transition-all"><ZapOff className="w-4.5 h-4.5"/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-10 space-y-8">
                            {logs.map(log => (
                                <div key={log.id} className="glass p-8 rounded-[40px] border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-pink-400 italic text-sm italic">{(log.profiles?.name || 'S')[0]}</div>
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest text-zinc-200">{log.profiles?.name || 'Neural Signal'}</div>
                                                <div className="text-[10px] text-zinc-600 font-black italic uppercase mt-1 tracking-widest">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                            </div>
                                        </div>
                                        {log.is_deleted && <div className="px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Deleted Legacy</div>}
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-pink-400/60">Soul Frequeny</div>
                                            <div className="text-sm text-zinc-300 leading-relaxed font-medium bg-white/[0.02] p-5 rounded-[28px] border border-white/[0.03]">"{log.message}"</div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400/60">Synthetic Echo</div>
                                            <div className="text-sm text-zinc-400 leading-relaxed font-bold bg-[#9b5cff]/5 p-5 rounded-[28px] border border-white/[0.03]">"{log.response}"</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

function PulseCard({ icon: Icon, label, value, color }: any) {
    const colors = {
        pink: 'from-pink-500/20 to-pink-500/5 text-pink-400 border-pink-500/10',
        purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/10',
        green: 'from-green-500/20 to-green-500/5 text-green-400 border-green-500/10'
    }
    return (
        <div className={`glass p-8 rounded-[48px] border bg-gradient-to-br ${colors[color as keyof typeof colors]} shadow-2xl shadow-black/20`}>
            <div className="flex items-center gap-6">
                <div className={`p-4 rounded-[28px] bg-white/5 border border-white/5`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">{label}</div>
                    <div className="text-4xl font-black italic tracking-tighter">{value}</div>
                </div>
            </div>
        </div>
    )
}

function TabBtn({ active, label, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white/10 text-white shadow-xl border border-white/5' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
            {label}
        </button>
    )
}
