import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-40 lg:hidden p-2.5 bg-card border border-border rounded-xl shadow-lg text-text-secondary hover:text-text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-info/5 blur-[100px]" />
        </div>
        <main className="flex-1 overflow-y-auto relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
