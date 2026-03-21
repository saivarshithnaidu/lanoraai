"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Key, Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addingKey, setAddingKey] = useState(false)
  const [newKey, setNewKey] = useState({ provider: 'openrouter', api_key: '' })

  const supabase = createClient()

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/keys')
      const data = await res.json()
      if (res.ok) setKeys(data)
      else toast.error(data.error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingKey(true)
    
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success("API key added successfully!")
        setNewKey({ provider: 'openrouter', api_key: '' })
        fetchKeys()
      } else {
        toast.error(data.error)
      }
    } finally {
      setAddingKey(false)
    }
  }

  const deleteKey = async (id: string) => {
     try {
       const res = await fetch(`/api/admin/keys?id=${id}`, { method: 'DELETE' })
       const data = await res.json()
       if (res.ok) {
         toast.success("API key deleted!")
         fetchKeys()
       } else {
         toast.error(data.error)
       }
     } catch (e) {
       toast.error("Failed to delete key")
     }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
                <p className="text-zinc-500 font-medium">Manage and rotate your pool of API keys</p>
            </div>
            <div className="px-5 py-2.5 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                Key Rotation Active
            </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-10">
            {/* Add Key Form */}
            <div className="lg:col-span-1 border border-white/5 glass p-8 rounded-[40px] h-fit">
                <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-white" />
                     </div>
                     <h2 className="text-lg font-bold tracking-tight">Add New Key</h2>
                </div>
                <form onSubmit={handleAddKey} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-600 ml-1">Provider</label>
                        <select 
                            value={newKey.provider} 
                            onChange={(e) => setNewKey({...newKey, provider: e.target.value})}
                            className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/5 outline-none focus:border-indigo-600/50 transition-all text-sm font-medium"
                        >
                            <option value="openrouter" className="bg-[#050505]">OpenRouter</option>
                            <option value="groq" className="bg-[#050505]">Groq</option>
                            <option value="openai" className="bg-[#050505]">OpenAI</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-600 ml-1">API Key Content</label>
                        <input 
                            type="password"
                            placeholder="sk-...."
                            value={newKey.api_key}
                            onChange={(e) => setNewKey({...newKey, api_key: e.target.value})}
                            required
                            className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-white/5 outline-none focus:border-indigo-600/50 transition-all text-sm font-medium placeholder:text-zinc-700"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={addingKey}
                        className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                    >
                        {addingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Key to Pool"}
                    </button>
                    <p className="text-[10px] text-center text-zinc-600 leading-relaxed pt-4">API keys are encrypted and server-side only. Rotation logic always picks least used active key.</p>
                </form>
            </div>

            {/* Keys Table Section */}
            <div className="lg:col-span-2 border border-white/5 glass rounded-[48px] overflow-hidden">
                {loading ? (
                    <div className="p-20 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600/40" />
                    </div>
                ) : (
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest border-b border-white/5 bg-white/5">
                                <tr>
                                    <th className="px-8 py-5">Provider</th>
                                    <th className="px-8 py-5">Usage Count</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {keys.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-12 text-center text-zinc-600 font-medium">No API keys found in the pool.</td>
                                    </tr>
                                ) : (
                                    keys.map((key) => (
                                        <tr key={key.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6 font-bold uppercase flex items-center gap-2 text-indigo-400">
                                                <Zap className="w-3.5 h-3.5" />
                                                {key.provider}
                                            </td>
                                            <td className="px-8 py-6 font-mono text-zinc-500">{key.usage_count} Requests</td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    {key.status === 'active' ? (
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 font-bold text-[10px] border border-green-500/20">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-bold text-[10px] border border-red-500/20">
                                                            <XCircle className="w-3.5 h-3.5" /> {key.status.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button onClick={() => deleteKey(key.id)} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}
