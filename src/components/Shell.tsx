
import React from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Menu, Home, Bot, Settings } from 'lucide-react'

export default function Shell(){
  const loc = useLocation()
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 backdrop-blur bg-bg/80 border-b border-border">
        <div className="max-w-screen-sm mx-auto px-4 py-3 flex items-center gap-3">
          <Menu className="text-muted" size={22}/>
          <h1 className="h1">Mentor ANA</h1>
        </div>
      </header>
      <main className="max-w-screen-sm mx-auto px-4 py-4">
        <Outlet/>
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border">
        <div className="max-w-screen-sm mx-auto px-2 py-1 grid grid-cols-3 gap-2 text-xs">
          <NavItem to="/" icon={<Home size={26}/>} active={loc.pathname==='/'} label="Hub"/>
          <NavItem to="/mentor" icon={<Bot size={26}/>} active={loc.pathname.startsWith('/mentor')} label="Mentor"/>
          <NavItem to="/settings" icon={<Settings size={26}/>} active={loc.pathname.startsWith('/settings')} label="Setări"/>
        </div>
      </nav>
      <div className="h-16"></div>
    </div>
  )
}

function NavItem({to, icon, label, active}:{to:string, icon:React.ReactNode, label:string, active?:boolean}){
  return <Link to={to} className={"flex flex-col items-center justify-center rounded-xl py-2 "+(active?"text-primary":"text-muted")}>
    <div className="mb-0.5">{icon}</div>
    <div className="text-[11px]">{label}</div>
  </Link>
}
