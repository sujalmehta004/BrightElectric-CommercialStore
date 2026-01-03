import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

interface MenuItem {
  label: string;
  action?: () => void;
  path?: string;
  shortcut?: string;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

import { useShopSettings } from '../stores/useShopSettings';

export const MenuBar = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const { details } = useShopSettings();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (item: MenuItem) => {
    setActiveMenu(null);
    if (item.action) item.action();
    if (item.path) navigate(item.path);
  };

  const menuStructure: MenuSection[] = [
    {
      label: 'File',
      items: [
        { label: 'Dashboard', path: '/', shortcut: '⌘D' },
        { label: 'Settings', path: '/settings', shortcut: '⌘,' },
        { label: 'Exit', action: () => window.close(), shortcut: '⌘Q' },
      ]
    },
    {
      label: 'Modules',
      items: [
        { label: 'Billing / POS', path: '/billing', shortcut: 'F1' },
        { label: 'Inventory', path: '/inventory', shortcut: 'F2' },
        { label: 'Repairs', path: '/repairs', shortcut: 'F3' },
        { label: 'Suppliers', path: '/suppliers', shortcut: 'F4' },
      ]
    },
    {
      label: 'Management',
      items: [
        { label: 'Customers', path: '/customers' },
        { label: 'Users & Roles', path: '/users' },
      ]
    },
    {
      label: 'View',
      items: [
        { label: 'Reports', path: '/reports' },
        { label: 'Toggle Fullscreen', action: () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() },
      ]
    }
  ];

  return (
    <div className="bg-slate-800 text-white flex items-center px-2 text-sm select-none shadow-md z-50 fixed w-full top-0 h-9" ref={menuRef}>
      <div className="font-bold text-blue-400 px-3 border-r border-slate-700 mr-2 cursor-pointer" onClick={() => navigate('/')}>
        {details.storeName || 'ElectroPOS'}
      </div>
      {menuStructure.map((section) => (
        <div key={section.label} className="relative">
          <div
            className={`px-3 py-1 cursor-pointer rounded hover:bg-slate-700 transition-colors ${activeMenu === section.label ? 'bg-slate-700' : ''}`}
            onClick={() => setActiveMenu(activeMenu === section.label ? null : section.label)}
            onMouseEnter={() => activeMenu && setActiveMenu(section.label)}
          >
            {section.label}
          </div>

          {activeMenu === section.label && (
            <div className="absolute top-full left-0 bg-slate-800 border border-slate-700 shadow-xl min-w-[200px] py-1 rounded-b-md">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 hover:bg-blue-600 cursor-pointer flex justify-between items-center group"
                  onClick={() => handleAction(item)}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-slate-500 text-xs group-hover:text-blue-200">{item.shortcut}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="ml-auto text-xs text-slate-400 px-4">
        {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};
