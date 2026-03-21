import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Key, ClipboardList, CreditCard, AlertCircle, Sparkles } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const isUserAdmin = await isAdmin()

    if (!isUserAdmin) {
        redirect('/chat')
    }

    return (
        <div className="flex min-h-screen bg-[#050505] text-zinc-100">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 glass p-6 flex flex-col gap-8 flex-shrink-0 sticky top-0 h-screen">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-lg">Lanora Admin</span>
                </div>

                <nav className="flex-grow space-y-1">
                    {[
                        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
                        { name: 'API Keys', href: '/admin/keys', icon: Key },
                        { name: 'Chat Logs', href: '/admin/logs/chat', icon: ClipboardList },
                        { name: 'Payments', href: '/admin/payments', icon: CreditCard },
                        { name: 'Error Logs', href: '/admin/logs/error', icon: AlertCircle },
                    ].map((item) => (
                        <Link 
                            key={item.href} 
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-zinc-400 hover:text-white font-medium text-sm"
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
                
                <div className="pt-6 border-t border-white/5">
                    <Link href="/chat" className="text-xs text-zinc-500 hover:text-white transition-colors">Back to App</Link>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 p-10 overflow-auto">
                {children}
            </main>
        </div>
    )
}
