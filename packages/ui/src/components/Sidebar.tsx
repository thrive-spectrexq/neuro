import React, { useState } from 'react';

export interface SidebarProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ children, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <aside className={`flex flex-col border-r bg-gray-50 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <span className="font-semibold text-lg">Menu</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-200 focus:outline-none"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {children}
      </div>
    </aside>
  );
};
