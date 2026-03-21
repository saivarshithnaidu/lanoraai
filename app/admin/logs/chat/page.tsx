import { createAdminClient } from '@/lib/supabase/server'
import { MessageSquare, User, Calendar, Tag, ChevronDown, Activity, Zap } from 'lucide-react'

export default async function ChatLogsPage() {
  const supabase = await createAdminClient()
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .eq('type', 'chat')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Chat Activity Logs</h1>
                <p className="text-zinc-500 font-medium">Monitoring emotional connections and responses</p>
            </div>
            <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-indigo-400" />
                 </div>
                 <span className="font-bold text-sm">Real-time Feed</span>
            </div>
        </header>

        <div className="space-y-6">
            <div className="flex items-center justify-between px-6 py-4 rounded-2xl border border-white/5 bg-white/5 mb-8">
                 <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> Active Requests</span>
                    <span className="flex items-center gap-2"><Tag className="w-3 h-3" /> Latest: GPT-4o-mini</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                    Filter: All Providers <ChevronDown className="w-4 h-4" />
                 </div>
            </div>

            <div className="grid gap-6">
                {logs?.length === 0 ? (
                    <div className="p-20 text-center glass rounded-[48px] border border-white/5 opacity-50 font-medium">No chat logs recorded yet.</div>
                ) : (
                    logs?.map((log) => (
                        <div key={log.id} className="p-8 rounded-[40px] glass border border-white/5 hover:bg-white/5 transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 pt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
                                <Calendar className="w-3 h-3" /> {new Date(log.created_at).toLocaleString()}
                             </div>
                             
                             <div className="flex items-start gap-8 relative z-10">
                                <div className="w-16 h-16 rounded-[28px] bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 transition-all">
                                    <MessageSquare className="w-8 h-8 text-indigo-400 group-hover:text-white" />
                                </div>
                                <div className="space-y-4 flex-grow">
                                     <div className="flex items-center gap-3">
                                         <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/20">EVENT SUCCESS</div>
                                         <span className="text-zinc-600 font-mono text-xs">User ID: {log.user_id?.substring(0, 13)}...</span>
                                     </div>
                                     <h3 className="text-xl font-bold tracking-tight">{log.message}</h3>
                                     <div className="flex items-center gap-6 mt-4">
                                         <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Tag className="w-4 h-4" /> Model: {log.metadata?.model || 'N/A'}
                                         </div>
                                         <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Activity className="w-4 h-4" /> Provider: {log.metadata?.provider || 'N/A'}
                                         </div>
                                         <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Zap className="w-4 h-4 text-yellow-500" /> {log.metadata?.tokens || 0} Tokens
                                         </div>
                                     </div>
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
