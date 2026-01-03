import { createContext, useContext, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

interface ModalOptions {
  title: string;
  message: ReactNode;
  type?: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'danger' | 'info' | 'success'; 
}

interface GlobalModalContextType {
  showAlert: (title: string, message: ReactNode) => Promise<void>;
  showConfirm: (title: string, message: ReactNode, options?: Partial<ModalOptions>) => Promise<boolean>;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

export const GlobalModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalOptions | null>(null);
  
  // We use this to resolve the promise for confirm/alert
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (title: string, message: ReactNode): Promise<void> => {
    return new Promise((resolve) => {
      setModalConfig({
        title,
        message,
        type: 'alert',
        confirmText: 'OK',
        onConfirm: () => resolve(),
      });
      setIsOpen(true);
      setResolvePromise(() => () => resolve());
    });
  };

  const showConfirm = (title: string, message: ReactNode, options?: Partial<ModalOptions>): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        title,
        message,
        type: 'confirm',
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        variant: options?.variant,
        onConfirm: async () => {
             if (options?.onConfirm) await options.onConfirm();
             resolve(true);
        },
        onCancel: () => {
             if (options?.onCancel) options.onCancel();
             resolve(false);
        }
      });
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    if (resolvePromise && modalConfig?.type === 'alert') {
        resolvePromise(true); // Alert just resolves
    } else if (resolvePromise) {
        resolvePromise(false); // Confirm treated as cancel if closed
    }
  };

  const handleConfirm = async () => {
    if (modalConfig?.onConfirm) await modalConfig.onConfirm();
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  return (
    <GlobalModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modalConfig && (
        <Modal isOpen={isOpen} onClose={handleClose} title={modalConfig.title}>
            <div className="space-y-4">
                <div className="text-slate-600 text-sm">
                    {modalConfig.message}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    {modalConfig.type === 'confirm' && (
                        <button 
                            onClick={handleClose}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-bold"
                        >
                            {modalConfig.cancelText || 'Cancel'}
                        </button>
                    )}
                    <button 
                         onClick={handleConfirm}
                         className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-bold ${
                             modalConfig.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
                         }`}
                    >
                        {modalConfig.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </Modal>
      )}
    </GlobalModalContext.Provider>
  );
};

export const useGlobalModal = () => {
  const context = useContext(GlobalModalContext);
  if (!context) {
    throw new Error('useGlobalModal must be used within a GlobalModalProvider');
  }
  return context;
};
