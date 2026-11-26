import { useEffect, useState } from 'react';
import { CapabilitiesSection } from './components/CapabilitiesSection.tsx';
import { Footer } from './components/Footer.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { PricingSection } from './components/PricingSection.tsx';
import { ScriptModernizer } from './components/ScriptModernizer.tsx';
import { TopBar } from './components/TopBar.tsx';
import { ORIGINAL_ATTACHED_CMD } from './utils/scriptAudit.ts';

export default function App() {
  const [scriptName, setScriptName] = useState('INICIAR-CORRECAO.cmd');
  const [scriptContent, setScriptContent] = useState(ORIGINAL_ATTACHED_CMD);

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
    return () => {
      active = false;
    };
  }, []);

  const navigateTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A]">
      <TopBar onNavigateSection={navigateTo} />
      <main className="flex-1">
        <HeroSection onJumpToModernizer={() => navigateTo('modernizador')} />
        <CapabilitiesSection />
        <ScriptModernizer initialFilename={scriptName} initialContent={scriptContent} />
        <PricingSection />
      </main>
      <Footer onNavigateSection={navigateTo} />
    </div>
  );
}
