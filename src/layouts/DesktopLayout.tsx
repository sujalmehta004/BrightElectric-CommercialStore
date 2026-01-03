import React from 'react';
import { Outlet } from 'react-router-dom';
import { MenuBar } from '../components/MenuBar';

export const DesktopLayout = () => {
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <MenuBar />
      <main className="flex-1 overflow-auto mt-9 p-8 bg-[#ececec] relative">
         <div className="absolute inset-0 pointer-events-none opacity-50 bg-[url('https://transparenttextures.com/patterns/cubes.png')]"></div>
         <div className="relative max-w-[1600px] mx-auto">
            <Outlet />
         </div>
      </main>
    </div>
  );
};
