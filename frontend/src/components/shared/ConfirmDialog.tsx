import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  variant?: 'danger' | 'primary'
  children?: React.ReactNode
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Hapus', loading, variant = 'danger', children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-indigo-100'}`}>
          <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-red-500' : 'text-indigo-500'}`} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
          {children}
        </div>
        <div className="flex gap-2 w-full">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
