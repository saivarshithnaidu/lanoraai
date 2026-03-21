import { createAdminClient } from '@/lib/supabase/server'
import { 
  Users, 
  MessageSquare, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Zap,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createAdminClient()

  // 1. Fetch Stats
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true })
  const { data: transactions } = await supabase.from('transactions').select('amount').eq('status', 'success')
  const totalRevenue = transactions?.reduce((acc, curr) => acc + curr.amount, 0) || 0

  // 2. Fetch Recent Activities Logs
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  // 3. API Key Status Overview
  const { data: apiKeys } = await supabase.from('api_keys').select('*')

  const stats = [
    { name: 'Total Users', value: userCount || 0, icon: Users, change: '+12%', trend: 'up' },
    { name: 'Total Messages', value: msgCount || 0, icon: MessageSquare, change: '+25%', trend: 'up' },
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, change: '+18%', trend: 'up' },
    { name: 'Active API Keys', value: apiKeys?.filter(k => k.status === 'active').length || 0, icon: Zap, change: 'Stable', trend: 'stable' },
  ]

  return (
    <div className="space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-zinc-500 font-medium">Real-time system metrics and activity logs</p>
        </div>
        <div className="flex gap-4">
             <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 System Online
             </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.name} className="p-8 rounded-[32px] glass border border-white/5 relative overflow-hidden group hover:bg-white/5 transition-all">
             <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
             <div className="flex flex-col gap-6 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <s.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                   <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{s.name}</div>
                   <div className="text-3xl font-bold tracking-tight">{s.value}</div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-xs font-bold">
                    {s.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                    {s.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                    <span className={s.trend === 'up' ? 'text-green-500' : s.trend === 'down' ? 'text-red-500' : 'text-zinc-500'}>
                         {s.change}
                    </span>
                    <span className="text-zinc-700 font-medium">vs last month</span>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Logs Section */}
          <div className="space-y-6">
               <div className="flex items-center justify-between">
                   <h2 className="text-xl font-bold flex items-center gap-3">
                        <Activity className="w-5 h-5 text-indigo-400" />
                        System Activity
                   </h2>
                   <Link href="/admin/logs/api" className="text-xs text-indigo-400 hover:text-white flex items-center gap-1 font-bold">
                       View All <ArrowRight className="w-3 h-3" />
                   </Link>
               </div>
               <div className="glass rounded-[32px] border border-white/5 overflow-hidden">
                    <div className="divide-y divide-white/5">
                        {logs?.map((log) => (
                             <div key={log.id} className="p-6 hover:bg-white/5 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                     <div className="space-y-1">
                                         <div className="text-sm font-bold capitalize">{log.type} Event</div>
                                         <p className="text-sm text-zinc-500">{log.message}</p>
                                     </div>
                                     <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                          {new Date(log.created_at).toLocaleTimeString()}
                                     </div>
                                </div>
                             </div>
                        ))}
                    </div>
               </div>
          </div>

          {/* API Keys Table Overview */}
          <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            API Key Health
                    </h2>
                    <Link href="/admin/keys" className="text-xs text-indigo-400 hover:text-white flex items-center gap-1 font-bold">
                        Manage Keys <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
                <div className="glass rounded-[32px] border border-white/5 overflow-hidden">
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-4">Provider</th>
                                    <th className="px-4 py-4">Usage</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {apiKeys?.map(key => (
                                     <tr key={key.id} className="border-b last:border-b-0 border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-5 font-bold uppercase">{key.provider}</td>
                                        <td className="px-4 py-5 font-mono text-zinc-500">{key.usage_count} </td>
                                        <td className="px-4 py-5">
                                            <div className="flex justify-center">
                                                {key.status === 'active' ? (
                                                     <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                     <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                            </div>
                                        </td>
                                     </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
          </div>
      </div>
    </div>
  )
}
