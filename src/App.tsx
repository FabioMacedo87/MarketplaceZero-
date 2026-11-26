import { useEffect, useState } from 'react';
import { AccountSection } from './components/AccountSection.tsx';
import { CapabilitiesSection } from './components/CapabilitiesSection.tsx';
import { Footer } from './components/Footer.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { PricingSection } from './components/PricingSection.tsx';
import { ScriptModernizer } from './components/ScriptModernizer.tsx';
import { TopBar } from './components/TopBar.tsx';
import { ORIGINAL_ATTACHED_CMD } from './utils/scriptAudit.ts';
import { supabase } from './lib/supabase.ts';

type PlanKey = 'essencial' | 'profissional' | 'empresarial';

export default function App() {
  const [scriptName, setScriptName] = useState('INICIAR-CORRECAO.cmd');
  const [scriptContent, setScriptContent] = useState(ORIGINAL_ATTACHED_CMD);
  const [billingReady, setBillingReady] = useState(false);
  const [planPrices, setPlanPrices] = useState<Partial<Record<PlanKey, number>>>({});
  const [checkoutMessage, setCheckoutMessage] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/initial-script')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Não foi possível carregar o exemplo.'))))
      .then((data) => {
        if (!active) return;
        if (typeof data.filename === 'string') setScriptName(data.filename);
        if (typeof data.content === 'string') setScriptContent(data.content);
      })
      .catch(() => {
        // O exemplo incorporado mantém a análise disponível se o servidor não responder.
      });

    fetch('/api/public-config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data) {
          setBillingReady(data.billingReady === true);
          setPlanPrices(data.prices && typeof data.prices === 'object' ? data.prices : {});
        }
      })
      .catch(() => {
        if (active) { setBillingReady(false); setPlanPrices({}); }
      });

    return () => {
      active = false;
    };
  }, []);

  const navigateTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const beginCheckout = async (planKey: PlanKey) => {
    setCheckoutMessage('');
    if (!supabase) {
      navigateTo('conta');
      setCheckoutMessage('A área pessoal ainda precisa de configuração.');
      return;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      navigateTo('conta');
      setCheckoutMessage('Inicia sessão na tua conta antes de escolher uma subscrição.');
      return;
    }

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + data.session.access_token,
        },
        body: JSON.stringify({ planKey }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.url !== 'string') {
        throw new Error(result.error || 'Não foi possível iniciar a subscrição.');
      }
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : 'Não foi possível iniciar a subscrição.');
      navigateTo('conta');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
      <TopBar onNavigateSection={navigateTo} />
      <main className="flex-1">
        <HeroSection onJumpToModernizer={() => navigateTo('modernizador')} />
        <CapabilitiesSection />
        <ScriptModernizer initialFilename={scriptName} initialContent={scriptContent} />
        <AccountSection billingReady={billingReady} />
        <PricingSection billingReady={billingReady} prices={planPrices} onSubscribe={beginCheckout} />
        {checkoutMessage && (
          <div role="status" className="max-w-[1200px] mx-auto px-6 py-4 text-sm text-slate-700">
            {checkoutMessage}
          </div>
        )}
      </main>
      <Footer onNavigateSection={navigateTo} />
    </div>
  );
}
