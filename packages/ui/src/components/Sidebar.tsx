import React, { useState } from 'react';

export interface SidebarProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside
      className={`flex flex-col border-r border-white/[0.08] bg-[#0E0E12]/80 backdrop-blur-2xl transition-all duration-300 ease-out select-none ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between p-3.5 border-b border-white/[0.06]">
        {!collapsed && (
          <span className="font-semibold text-xs tracking-tight text-[#F5F5F7]">Sidebar</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#86868B] hover:text-[#F5F5F7] hover:bg-white/[0.08] transition-colors focus:outline-none"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? '⇥' : '⇤'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">{children}</div>
    </aside>
  );
};
