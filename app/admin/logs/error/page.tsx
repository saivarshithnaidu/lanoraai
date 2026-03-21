import { createAdminClient } from '@/lib/supabase/server'
import { AlertCircle, User, Calendar, Tag, ChevronDown, Activity, XCircle } from 'lucide-react'

export default async function ErrorLogsPage() {
  const supabase = await createAdminClient()
  const { data: logs } = await supabase
    .from('error_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Error Logs</h1>
                <p className="text-zinc-500 font-medium">Tracking and diagnosing critical system failures</p>
            </div>
            <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                 </div>
                 <span className="font-bold text-sm">Critical Feed</span>
            </div>
        </header>

        <div className="space-y-6">
            <div className="flex items-center justify-between px-6 py-4 rounded-2xl border border-white/5 bg-white/5 mb-8">
                 <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Active Errors</span>
                 </div>
            </div>

            <div className="grid gap-6">
                {(logs?.length === 0) ? (
                    <div className="p-20 text-center glass rounded-[48px] border border-white/5 opacity-50 font-medium">No errors recorded yet. System is healthy.</div>
                ) : (
                    logs?.map((log) => (
                        <div key={log.id} className="p-8 rounded-[40px] glass border border-white/5 hover:bg-white/5 transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 pt-4 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
                                <Calendar className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString()}
                             </div>
                             
                             <div className="flex items-start gap-8 relative z-10">
                                <div className="w-16 h-16 rounded-[28px] bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0 group-hover:bg-red-600 transition-all">
                                    <XCircle className="w-8 h-8 text-red-500 group-hover:text-white" />
                                </div>
                                <div className="space-y-4 flex-grow">
                                     <div className="flex items-center gap-3">
                                         <div className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 font-bold text-[10px] border border-red-500/20 uppercase">CRITICAL FAILURE</div>
                                     </div>
                                     <h3 className="text-xl font-bold tracking-tight text-white">{log.message}</h3>
                                     {log.stack && (
                                         <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto">
                                             <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap">{log.stack}</pre>
                                         </div>
                                     )}
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
