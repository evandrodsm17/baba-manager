import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Modal } from './UI';

interface DangerConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  consequences: string[];
  confirmationText?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<unknown>;
}

export function DangerConfirmModal({
  open,
  title,
  description,
  consequences,
  confirmationText = 'EXCLUIR',
  confirmLabel = 'Excluir definitivamente',
  onClose,
  onConfirm,
}: DangerConfirmModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTypedConfirmation('');
  }, [open]);

  const confirm = async () => {
    if (typedConfirmation !== confirmationText || busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // O contexto mantém o modal aberto e apresenta o erro ao usuário.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
    >
      <div className="danger-confirm">
        <div className="danger-confirm__warning">
          <AlertTriangle size={22} />
          <div>
            <strong>Esta ação não pode ser desfeita</strong>
            <span>As dependências abaixo também serão removidas ou atualizadas.</span>
          </div>
        </div>
        <ul>
          {consequences.map((consequence) => <li key={consequence}>{consequence}</li>)}
        </ul>
        <label>
          <span>Digite <strong>{confirmationText}</strong> para continuar</span>
          <input
            autoComplete="off"
            value={typedConfirmation}
            onChange={(event) => setTypedConfirmation(event.target.value)}
            placeholder={confirmationText}
          />
        </label>
        <div className="form-actions">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            variant="danger"
            icon={Trash2}
            loading={busy}
            disabled={typedConfirmation !== confirmationText}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
