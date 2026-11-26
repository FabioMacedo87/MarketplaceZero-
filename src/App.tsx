import { useEffect, useState } from 'react';
import { CapabilitiesSection } from './components/CapabilitiesSection.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { Footer } from './components/Footer.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { PricingSection } from './components/PricingSection.tsx';
import { SaasConsole } from './components/SaasConsole.tsx';
import { ScriptModernizer } from './components/ScriptModernizer.tsx';
import { TopBar } from './components/TopBar.tsx';
import {
  INITIAL_INVOICES,
  INITIAL_RELEASES,
  INITIAL_SUBSCRIPTION,
  INITIAL_TEAM_SETTINGS,
  PLANS,
} from './data/plans.ts';
import {
  BillingCycle,
  CurrencyCode,
  PlanId,
  type InvoiceRecord,
  type ReleaseRecord,
  type ScriptAuditResult,
  type SubscriptionState,
  type TeamSettings,
} from './types.ts';
import { ORIGINAL_ATTACHED_CMD } from './utils/scriptAudit.ts';

export default function App() {
  const [activeView, setActiveView] = useState<'landing' | 'console'>('landing');
  const [cycle, setCycle] = useState<BillingCycle>(BillingCycle.MONTHLY);
  const [currency, setCurrency] = useState<CurrencyCode>(CurrencyCode.EUR);

  const [subscription, setSubscription] = useState<SubscriptionState>(INITIAL_SUBSCRIPTION);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [releases, setReleases] = useState<ReleaseRecord[]>(INITIAL_RELEASES);
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(INITIAL_TEAM_SETTINGS);

  const [scriptName, setScriptName] = useState('INICIAR-CORRECAO_5576a76e.cmd');
  const [scriptContent, setScriptContent] = useState(ORIGINAL_ATTACHED_CMD);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanId>(PlanId.PROFISSIONAL);
  const [consoleBanner, setConsoleBanner] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrateFromServer() {
      try {
        const [workspaceRes, scriptRes] = await Promise.all([
          fetch('/api/workspace'),
          fetch('/api/initial-script'),
        ]);
        if (!active) return;

        if (workspaceRes.ok) {
          const data = await workspaceRes.json();
          if (data.subscription) setSubscription(data.subscription);
          if (Array.isArray(data.invoices)) setInvoices(data.invoices);
          if (Array.isArray(data.releases)) setReleases(data.releases);
          if (data.settings) setTeamSettings(data.settings);
        }

        if (scriptRes.ok) {
          const sData = await scriptRes.json();
          if (sData.filename) setScriptName(sData.filename);
          if (sData.content) setScriptContent(sData.content);
        }
      } catch {
        // Initial fixtures remain active if server fetch fails
      }
    }
    void hydrateFromServer();
    return () => {
      active = false;
    };
  }, []);

  const handleNavigateSection = (sectionId: string) => {
    setActiveView('landing');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 40);
  };

  const handleOpenCheckout = (planId: PlanId = PlanId.PROFISSIONAL) => {
    setCheckoutPlanId(planId);
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = (nextSub: SubscriptionState, newInvoice: InvoiceRecord) => {
    setSubscription(nextSub);
    setInvoices((prev) => [newInvoice, ...prev.filter((inv) => inv.id !== newInvoice.id)]);
    setCheckoutOpen(false);
    setActiveView('console');
    const planLabel = PLANS.find((p) => p.id === nextSub.planId)?.name ?? nextSub.planId;
    setConsoleBanner(
      `Subscrição ${planLabel} ativada com sucesso. Fatura ${newInvoice.number} emitida para ${nextSub.billingEmail}.`,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseInConsole = (filename: string, _audit: ScriptAuditResult) => {
    setScriptName(filename);
    setActiveView('console');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
      <TopBar
        activeView={activeView}
        onNavigateView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateSection={handleNavigateSection}
        onStartSubscription={() => handleOpenCheckout(PlanId.PROFISSIONAL)}
      />

      {activeView === 'landing' ? (
        <main className="flex-1">
          <HeroSection
            onStartSubscription={() => handleOpenCheckout(PlanId.PROFISSIONAL)}
            onJumpToModernizer={() => handleNavigateSection('modernizador')}
          />
          <CapabilitiesSection />
          <ScriptModernizer
            initialFilename={scriptName}
            initialContent={scriptContent}
            onUseInConsole={handleUseInConsole}
          />
          <PricingSection
            cycle={cycle}
            currency={currency}
            activePlanId={subscription.active ? subscription.planId : null}
            onChangeCycle={setCycle}
            onChangeCurrency={setCurrency}
            onSelectPlan={(planId) => handleOpenCheckout(planId)}
          />
        </main>
      ) : (
        <div className="flex-1">
          <SaasConsole
            subscription={subscription}
            invoices={invoices}
            releases={releases}
            settings={teamSettings}
            activeScriptName={scriptName}
            activeScriptContent={scriptContent}
            bannerMessage={consoleBanner}
            onDismissBanner={() => setConsoleBanner(null)}
            onUpdateReleases={setReleases}
            onUpdateSubscription={setSubscription}
            onUpdateSettings={setTeamSettings}
            onOpenPlanChange={(planId) => handleOpenCheckout(planId)}
          />
        </div>
      )}

      <Footer
        onNavigateView={(view) => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateSection={handleNavigateSection}
      />

      <CheckoutModal
        isOpen={checkoutOpen}
        initialPlanId={checkoutPlanId}
        initialCycle={cycle}
        initialCurrency={currency}
        currentSubscription={subscription}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
