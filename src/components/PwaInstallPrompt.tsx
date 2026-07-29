import { Download, Share2, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

const dismissalKey = 'adminfut-pwa-install-dismissed-until';
const dismissalDuration = 7 * 24 * 60 * 60 * 1000;

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as StandaloneNavigator).standalone);
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function readDismissedUntil() {
  try {
    return Number(localStorage.getItem(dismissalKey) || 0);
  } catch {
    return 0;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(dismissalKey, String(Date.now() + dismissalDuration));
  } catch {
    // O navegador pode bloquear o storage; ocultar durante a sessão ainda funciona.
  }
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || readDismissedUntil() > Date.now()) return;

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowIosInstructions(false);
      setVisible(true);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setVisible(false);
    };
    const iosTimer = isIosDevice()
      ? window.setTimeout(() => {
        setShowIosInstructions(true);
        setVisible(true);
      }, 2500)
      : undefined;

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'dismissed') rememberDismissal();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="pwa-install-prompt" role="dialog" aria-label="Instalar AdminFut">
      <span className="pwa-install-prompt__icon"><Smartphone size={22} /></span>
      <div className="pwa-install-prompt__copy">
        <strong>Leve o AdminFut para a tela inicial</strong>
        {showIosInstructions && !installPrompt
          ? <p><Share2 size={15} /> No Safari, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
          : <p>Instale o app para abrir mais rápido e usar o painel em uma janela própria.</p>}
      </div>
      {installPrompt && (
        <button className="pwa-install-prompt__install" type="button" onClick={() => void install()}>
          <Download size={17} /> Instalar
        </button>
      )}
      <button className="pwa-install-prompt__close" type="button" aria-label="Lembrar depois" onClick={dismiss}>
        <X size={18} />
      </button>
    </aside>
  );
}
