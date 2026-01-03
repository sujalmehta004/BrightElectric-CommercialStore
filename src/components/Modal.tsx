import React, { Fragment } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn("bg-white rounded-2xl shadow-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200", maxWidth)}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
