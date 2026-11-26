import { useT } from '../../i18n';
import { Modal } from '../ui';
import { ShortcutsSection } from './ShortcutsSection';

export interface ShortcutHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  const { t } = useT();

  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')}>
      <ShortcutsSection />
    </Modal>
  );
}
