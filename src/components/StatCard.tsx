import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export const StatCard = ({ label, value, icon: Icon, trend, trendUp, className }: StatCardProps) => {
  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", trendUp ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
    </div>
  );
};
