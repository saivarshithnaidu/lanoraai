"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  MessageSquare, 
  Search, 
  Globe,
  Clock,
  Phone,
  History,
  Loader2,
  ShieldCheck,
  ZapOff
} from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface Profile {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  last_login: string | null;
  is_blocked: boolean | null;
  ip_address: string | null;
  credits: number | null;
  id: string;
}

interface Log {
  id: string;
  created_at: string;
  message: string;
  response: string;
  profiles: {
    full_name: string;
  } | null;
}

interface Message {
  id: string;
  created_at: string;
  role: string;
  content: string;
  is_deleted?: boolean;
  profiles: {
    full_name: string;
  } | null;
}

type Tab = 'souls' | 'pulse' | 'audit' | 'messages'

export default function AdminOmniscence() {
    const [activeTab, setActiveTab] = useState<Tab>('souls')
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<Profile[]>([])
    const [logs, setLogs] = useState<Log[]>([])
    const [allMessages, setAllMessages] = useState<Message[]>([])
    const [search, setSearch] = useState('')
    const [stats, setStats] = useState({ totalSouls: 0, liveMessages: 0, allMsgs: 0 })

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        
        // Live Monitoring Subscription
        const channel = supabase
            .channel('admin_pulse')
            .on('postgres_changes', { event: 'INSERT', table: 'chat_logs', schema: 'public' }, (payload) => {
                setLogs(prev => [payload.new as Log, ...prev].slice(0, 50))
                setStats(prev => ({ ...prev, liveMessages: prev.liveMessages + 1 }))
            })
            .on('postgres_changes', { event: '*', table: 'messages', schema: 'public' }, () => {
                // Refresh messages if one is added or deleted
                if (activeTab === 'messages') fetchData()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeTab, search, supabase])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/stats?tab=${activeTab}&search=${encodeURIComponent(search)}`)
            const result = await res.json()
            
            if (activeTab === 'souls') setUsers(result.data || [])
            else if (activeTab === 'audit') setLogs(result.data || [])
            else if (activeTab === 'messages') setAllMessages(result.data || [])
            
            setStats(result.counts || { totalSouls: 0, liveMessages: 0, allMsgs: 0 })
        } catch (error) {
            console.error('Fetch error:', error)
            toast.error("Shield failed to retrieve data registry.")
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (userId: string, action: string, value?: string | number | null) => {
        let finalValue = value
        if (action === 'update_credits') {
            const currentVal = value?.toString() || '100'
            const newCreditsStr = prompt("New energy reserve level?", currentVal)
            if (newCreditsStr === null) return
            finalValue = parseInt(newCreditsStr)
            if (isNaN(finalValue as number)) return
        } else if (action === 'update_phone') {
            const currentVal = value?.toString() || ''
            const newPhone = prompt("Enter replacement phone number:", currentVal)
            if (newPhone === null) return
            finalValue = newPhone.trim()
        }

        try {
            const res = await fetch('/api/admin/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action, value: finalValue })
            })
            const result = await res.json()
            if (result.success) {
                toast.success("Identity database synchronized.")
                fetchData()
            } else {
                throw new Error(result.error)
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            toast.error(`Operation failure: ${errorMessage}`)
        }
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header / Command Pulse */}
            <div className="grid md:grid-cols-3 gap-6">
                <PulseCard icon={Users} label="Total Souls" value={stats.totalSouls} color="pink" />
                <PulseCard icon={MessageSquare} label="Synapse History" value={stats.liveMessages} color="purple" />
                <PulseCard icon={ShieldCheck} label="Guardian Status" value="Online" color="green" />
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white/5 p-1.5 rounded-[24px] w-fit border border-white/5">
                <TabBtn active={activeTab==='souls'} label="Soul Registry" onClick={()=>setActiveTab('souls')} />
                <TabBtn active={activeTab==='audit'} label="Chat Logs (Internal)" onClick={()=>setActiveTab('audit')} />
                <TabBtn active={activeTab==='messages'} label="Global Message Stream" onClick={()=>setActiveTab('messages')} />
            </div>

            {/* Main Registry View */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[48px] border border-white/10 overflow-hidden shadow-2xl"
            >
                <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">{activeTab === 'souls' ? 'Identity Database' : (activeTab === 'audit' ? 'Internal Syapse Audit' : 'Direct Message Stream')}</h2>
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-pink-400" />
                        <input 
                            value={search}
                            onChange={(e)=>setSearch(e.target.value)}
                            placeholder="Identify search parameters..." 
                            className="bg-zinc-900/50 border border-white/5 h-14 pl-14 pr-8 rounded-[28px] outline-none focus:border-pink-500/40 w-full md:w-80 text-sm font-bold transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <Loader2 className="w-10 h-10 animate-spin text-pink-500/50" />
                        </div>
                    ) : activeTab === 'souls' ? (
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
                                    <tr key={u.id as string} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-8">
                                            <div className="font-black text-[16px] text-white tracking-tight">{u.full_name || 'Anonymous Soul'}</div>
                                            <div className="text-[10px] text-zinc-600 font-black uppercase mt-1 tracking-widest">{u.email}</div>
                                            <button 
                                                onClick={()=>handleAction(u.id, 'update_phone', u.phone_number)}
                                                className="text-[10px] text-zinc-700 font-bold mt-1.5 flex items-center gap-2 hover:text-pink-400 transition-colors cursor-pointer"
                                            >
                                                <Phone className="w-3 h-3 text-pink-500/40" /> 
                                                {u.phone_number || 'Update Signal Link'}
                                            </button>
                                            <div className="mt-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-600'}`}>
                                                    {u.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-[11px] font-black text-zinc-400 italic"><Clock className="w-3.5 h-3.5 text-pink-500/50" /> {u.last_login ? `In: ${new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never'} • {u.is_blocked ? <span className="text-red-500">BLOCKED</span> : 'Active'}</div>
                                                <div className="text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2"><Globe className="w-3 h-3" /> IP: {u.ip_address || 'Encrypted'}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-8 text-center">
                                            <button 
                                                onClick={()=>handleAction(u.id, 'update_credits', u.credits)}
                                                className="text-2xl font-black italic text-pink-400 tracking-tighter hover:scale-110 transition-transform cursor-pointer"
                                            >
                                                {u.credits} ⚡
                                            </button>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <button onClick={()=>handleAction(u.id, 'reset')} className="p-3.5 bg-white/5 rounded-2xl text-zinc-600 hover:text-pink-400 hover:bg-pink-500/5 transition-all" title="Reset to 100"><History className="w-4.5 h-4.5"/></button>
                                                {u.is_blocked ? (
                                                    <button onClick={()=>handleAction(u.id, 'unblock')} className="p-3.5 bg-green-500/10 rounded-2xl text-green-500 hover:bg-green-500/20 transition-all" title="Unblock Soul"><ShieldCheck className="w-4.5 h-4.5"/></button>
                                                ) : (
                                                    <button onClick={()=>handleAction(u.id, 'block')} className="p-3.5 bg-white/5 rounded-2xl text-zinc-600 hover:text-red-500 hover:bg-red-500/5 transition-all" title="Block Soul"><ZapOff className="w-4.5 h-4.5"/></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : activeTab === 'audit' ? (
                        <div className="p-10 space-y-8">
                            {logs.map(log => (
                                <div key={log.id} className="glass p-8 rounded-[40px] border border-white/5 group hover:border-white/10 transition-all">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-pink-400 italic text-sm italic">{(log.profiles?.full_name || 'S')[0]}</div>
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest text-zinc-200">{log.profiles?.full_name || 'Neural Signal'}</div>
                                                <div className="text-[10px] text-zinc-600 font-black italic uppercase mt-1 tracking-widest">{new Date(log.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-4">
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-pink-400/60 font-bold tracking-widest italic uppercase">Soul Input</div>
                                            <div className="text-sm text-zinc-300 leading-relaxed font-medium bg-white/[0.02] p-5 rounded-[28px] border border-white/[0.03]">&quot;{log.message}&quot;</div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-purple-400/60 font-bold tracking-widest italic uppercase">Lanora Echo</div>
                                            <div className="text-sm text-zinc-400 leading-relaxed font-bold bg-[#9b5cff]/5 p-5 rounded-[28px] border border-white/[0.03]">&quot;{log.response}&quot;</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 space-y-4">
                            {allMessages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-6 rounded-[32px] border ${msg.role === 'user' ? 'bg-pink-500/10 border-pink-500/20 rounded-tr-none' : 'bg-white/5 border-white/10 rounded-tl-none'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{msg.profiles?.full_name || (msg.role === 'user' ? 'User' : 'Lanora')}</span>
                                            <span className="text-[8px] text-zinc-700">{new Date(msg.created_at).toLocaleTimeString()}</span>
                                            {msg.is_deleted && <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black uppercase">DELETED</span>}
                                        </div>
                                        <div className="text-sm font-medium leading-relaxed">{msg.content}</div>
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

function PulseCard({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: string | number, color: 'pink' | 'purple' | 'green' }) {
    const colors = {
        pink: 'from-pink-500/20 to-pink-500/5 text-pink-400 border-pink-500/10',
        purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/10',
        green: 'from-green-500/20 to-green-500/5 text-green-400 border-green-500/10'
    }
    return (
        <div className={`glass p-8 rounded-[48px] border bg-gradient-to-br ${colors[color]} shadow-2xl shadow-black/20`}>
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

function TabBtn({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={`px-8 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'bg-white/10 text-white shadow-xl border border-white/5' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
            {label}
        </button>
    )
}
