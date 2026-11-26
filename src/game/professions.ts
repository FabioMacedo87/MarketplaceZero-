import type {
  MiniGameKind,
  MissionScenarioId,
  NpcOption,
  ProfessionId,
  VehicleType,
} from './types.ts';

export interface ProfessionDef {
  id: ProfessionId;
  title: string;
  shortTitle: string;
  roleSubtitle: string;
  colorHex: string;
  uniformHex: string;
  vehicleType: VehicleType;
  vehicleLabel: string;
  vehicleColor: string;
  baseSalary: number;
  description: string;
  dutiesLabel: string;
}

export const PROFESSION_ORDER: ProfessionId[] = [
  'taxi',
  'courier',
  'merchant',
  'paramedic',
  'psp',
];

export const PROFESSIONS: Record<ProfessionId, ProfessionDef> = {
  taxi: {
    id: 'taxi',
    title: 'Motorista TVDE / Táxi',
    shortTitle: 'Motorista',
    roleSubtitle: 'Transporte Urbano do Porto',
    colorHex: '#10B981',
    uniformHex: '#047857',
    vehicleType: 'taxi',
    vehicleLabel: 'Táxi do Porto',
    vehicleColor: '#18181B',
    baseSalary: 320,
    description:
      'Transporta passageiros entre São Bento, Ribeira, Boavista e Gaia com bónus por condução segura.',
    dutiesLabel: 'Recolher passageiros · Diálogos · Condução suave',
  },
  courier: {
    id: 'courier',
    title: 'Estafeta & Logística',
    shortTitle: 'Estafeta',
    roleSubtitle: 'Entregas Douro Expresso',
    colorHex: '#F59E0B',
    uniformHex: '#B45309',
    vehicleType: 'buggy',
    vehicleLabel: 'Carrinha Douro Expresso',
    vehicleColor: '#D97706',
    baseSalary: 350,
    description:
      'Sela cargas frágeis de Vinho do Porto e encomendas do Bolhão antes de atravessar as pontes.',
    dutiesLabel: 'Selagem de carga · Entregas entre margens',
  },
  merchant: {
    id: 'merchant',
    title: 'Empresário & Comerciante',
    shortTitle: 'Empresário',
    roleSubtitle: 'Comércio Histórico do Porto',
    colorHex: '#A855F7',
    uniformHex: '#6D28D9',
    vehicleType: 'coupe',
    vehicleLabel: 'Coupé Boavista GT',
    vehicleColor: '#4F46E5',
    baseSalary: 410,
    description:
      'Negocia contratos com comerciantes locais no Palácio da Bolsa, Bolhão, Lello e Casa da Música.',
    dutiesLabel: 'Negociação NPC · Contabilidade e contratos',
  },
  paramedic: {
    id: 'paramedic',
    title: 'Paramédico INEM',
    shortTitle: 'Paramédico',
    roleSubtitle: 'Emergência Médica do Porto',
    colorHex: '#F43F5E',
    uniformHex: '#BE123C',
    vehicleType: 'muscle',
    vehicleLabel: 'Viatura Médica INEM',
    vehicleColor: '#F8FAFC',
    baseSalary: 390,
    description:
      'Responde a pedidos 112 e ocorrências clínicas pela cidade, estabilizando cidadãos em triagem.',
    dutiesLabel: 'Chamadas 112 · Triagem cardíaca · Apoio clínico',
  },
  psp: {
    id: 'psp',
    title: 'Agente da PSP Porto',
    shortTitle: 'PSP Porto',
    roleSubtitle: 'Polícia de Segurança Pública',
    colorHex: '#38BDF8',
    uniformHex: '#1D4ED8',
    vehicleType: 'police',
    vehicleLabel: 'Viatura PSP Porto',
    vehicleColor: '#F8FAFC',
    baseSalary: 400,
    description:
      'Patrulha o Porto, controla velocidade com radar, inspeciona documentos e aplica multas ou avisos a jogadores.',
    dutiesLabel: 'Radar · Abordagem a condutores · Alertas 112',
  },
};

export interface ProfessionMissionTemplate {
  scenarioId: MissionScenarioId;
  title: string;
  goText: string;
  deliverText: string;
  sourceId: string;
  destId: string;
  rewardCash: number;
  miniGameKind: MiniGameKind;
  miniGameTitle: string;
  miniGameSubtitle: string;
  npcName: string;
  npcRole: string;
  npcColor: string;
  npcGreeting: string;
  npcOptions: NpcOption[];
}

export const PROFESSION_MISSIONS: Record<ProfessionId, ProfessionMissionTemplate[]> = {
  taxi: [
    {
      scenarioId: 'saobento_bolsa',
      title: 'Corrida TVDE: São Bento → Palácio da Bolsa',
      goText: 'Dirija-se à Estação de São Bento para receber o passageiro executivo.',
      deliverText: 'Transporte o passageiro com suavidade até ao Palácio da Bolsa.',
      sourceId: 'estacao-sao-bento',
      destId: 'palacio-da-bolsa',
      rewardCash: 360,
      miniGameKind: 'ledger_trade',
      miniGameTitle: 'Check-in de Tarifa & Rota',
      miniGameSubtitle: 'Confirme os 3 códigos de bilheteira antes de arrancar.',
      npcName: 'Dr. Henrique Silva',
      npcRole: 'Passageiro em São Bento',
      npcColor: '#10B981',
      npcGreeting:
        'Bom dia! Acabei de chegar no comboio de Lisboa e tenho reunião no Salão Árabe do Palácio da Bolsa.',
      npcOptions: [
        {
          label: 'Seguir pela rota panorâmica dos Aliados',
          reply: 'Excelente escolha, assim aproveito para ver a Baixa!',
          cashBonus: 70,
          repBonus: 8,
        },
        {
          label: 'Ir pelo atalho direto da Rua das Flores',
          reply: 'Ótimo, preciso de chegar pontualmente.',
          cashBonus: 45,
          repBonus: 5,
        },
      ],
    },
    {
      scenarioId: 'clerigos_musica',
      title: 'Viagem Cultural: Clérigos → Casa da Música',
      goText: 'Recolha a turista junto à Torre dos Clérigos.',
      deliverText: 'Leve a passageira até à Rotunda da Boavista (Casa da Música).',
      sourceId: 'torre-clerigos',
      destId: 'casa-da-musica',
      rewardCash: 390,
      miniGameKind: 'cargo_seal',
      miniGameTitle: 'Acomodar Bagagem no Porta-Bagagens',
      miniGameSubtitle: 'Acerte na zona verde para proteger o violino na mala.',
      npcName: 'Clara Mendes',
      npcRole: 'Musicista',
      npcColor: '#38BDF8',
      npcGreeting:
        'Olá! Tenho um ensaio na Casa da Música e levo um violino antigo que precisa de todo o cuidado.',
      npcOptions: [
        {
          label: 'Garantir condução suave sem travagens bruscas',
          reply: 'Muito obrigada pela atenção, vou recomendar o seu serviço!',
          cashBonus: 85,
          repBonus: 10,
        },
        {
          label: 'Ajustar bagagem e ligar o ar condicionado',
          reply: 'Perfeito, podemos seguir pela Boavista.',
          cashBonus: 50,
          repBonus: 6,
        },
      ],
    },
  ],
  courier: [
    {
      scenarioId: 'bolhao_gaia',
      title: 'Encomenda Vintage: Bolhão → Caves Sandeman',
      goText: 'Vá ao Mercado do Bolhão preparar as caixas de Vinho do Porto.',
      deliverText: 'Atravesse a Ponte Dom Luís I até às Caves Sandeman em Gaia.',
      sourceId: 'mercado-bolhao',
      destId: 'caves-sandeman',
      rewardCash: 420,
      miniGameKind: 'cargo_seal',
      miniGameTitle: 'Selagem de Caixas Frágeis',
      miniGameSubtitle: 'Trave o marcador na zona segura 3 vezes para selar as garrafas.',
      npcName: 'Dona Beatriz',
      npcRole: 'Comerciante do Bolhão',
      npcColor: '#F59E0B',
      npcGreeting:
        'Estas seis garrafas Vintage vão para a cave de provas em Gaia. Precisam de ser seladas com precisão!',
      npcOptions: [
        {
          label: 'Usar espuma térmica reforçada na caixa',
          reply: 'Que capricho! Assim nem uma gota se perde na travessia.',
          cashBonus: 90,
          repBonus: 10,
        },
        {
          label: 'Conferir guia de transporte e acelerar',
          reply: 'Guia assinada, boa viagem até Gaia!',
          cashBonus: 50,
          repBonus: 5,
        },
      ],
    },
    {
      scenarioId: 'lello_musica',
      title: 'Entrega Literária: Livraria Lello → Serra do Pilar',
      goText: 'Recolha a edição especial na Livraria Lello.',
      deliverText: 'Entregue o volume cultural no Mosteiro da Serra do Pilar.',
      sourceId: 'livraria-lello',
      destId: 'serra-do-pilar',
      rewardCash: 440,
      miniGameKind: 'cargo_seal',
      miniGameTitle: 'Embalamento de Edição Rara',
      miniGameSubtitle: 'Sele a proteção contra humidade no momento exato.',
      npcName: 'Mateus Ferreira',
      npcRole: 'Livreiro das Carmelitas',
      npcColor: '#A855F7',
      npcGreeting:
        'Esta edição ilustrada do Porto vai para a exposição da Serra do Pilar. Ajuda a fechar a caixa?',
      npcOptions: [
        {
          label: 'Incluir certificado de autenticidade numerado',
          reply: 'Excelente cuidado com o património.',
          cashBonus: 80,
          repBonus: 9,
        },
        {
          label: 'Carimbar entrega prioritária',
          reply: 'Tudo pronto para seguir viagem!',
          cashBonus: 45,
          repBonus: 5,
        },
      ],
    },
  ],
  merchant: [
    {
      scenarioId: 'camara_se',
      title: 'Licença Comercial: Câmara Municipal → Sé do Porto',
      goText: 'Visite a Câmara Municipal nos Aliados para validar o alvará.',
      deliverText: 'Leve o contrato assinado ao espaço cultural no Terreiro da Sé.',
      sourceId: 'camara-municipal',
      destId: 'se-do-porto',
      rewardCash: 460,
      miniGameKind: 'ledger_trade',
      miniGameTitle: 'Auditoria & Registo de Contrato',
      miniGameSubtitle: 'Associe os 3 registos fiscais para aprovar a licença.',
      npcName: 'Eng.ª Sofia Bastos',
      npcRole: 'Diretora de Licenciamento',
      npcColor: '#A855F7',
      npcGreeting:
        'Bem-vindo aos Paços do Concelho. Vamos rever os três códigos da sua nova loja na Sé.',
      npcOptions: [
        {
          label: 'Propor parceria com artesãos locais do Porto',
          reply: 'Excelente iniciativa! A Câmara aprova um incentivo comercial.',
          cashBonus: 110,
          repBonus: 12,
        },
        {
          label: 'Submeter pedido normal de balcão',
          reply: 'Tudo conforme a lei municipal.',
          cashBonus: 60,
          repBonus: 6,
        },
      ],
    },
    {
      scenarioId: 'saobento_bolsa',
      title: 'Negócio no Salão Árabe: São Bento → Palácio da Bolsa',
      goText: 'Reúna-se com o fornecedor na Praça Almeida Garrett (São Bento).',
      deliverText: 'Feche o acordo de exportação no Palácio da Bolsa.',
      sourceId: 'estacao-sao-bento',
      destId: 'palacio-da-bolsa',
      rewardCash: 490,
      miniGameKind: 'ledger_trade',
      miniGameTitle: 'Negociação da Bolsa do Porto',
      miniGameSubtitle: 'Combine os lotes de exportação corretos no livro de contas.',
      npcName: 'Tiago "O Barqueiro"',
      npcRole: 'Parceiro Logístico da Ribeira',
      npcColor: '#38BDF8',
      npcGreeting:
        'Tenho dois compradores estrangeiros à espera no Palácio da Bolsa. Vamos alinhar as margens?',
      npcOptions: [
        {
          label: 'Investir em denominação de origem certificada',
          reply: 'Os investidores adoram qualidade certificada do Douro!',
          cashBonus: 120,
          repBonus: 12,
        },
        {
          label: 'Negociar entrega rápida sem custos extra',
          reply: 'Fechado! Vamos ao Palácio assinar.',
          cashBonus: 65,
          repBonus: 6,
        },
      ],
    },
  ],
  paramedic: [
    {
      scenarioId: 'clerigos_musica',
      title: 'Emergência INEM: Clérigos → Casa da Música',
      goText: 'Aceda à zona dos Clérigos para prestar primeiros socorros.',
      deliverText: 'Transporte o utente estabilizado até ao posto de apoio na Boavista.',
      sourceId: 'torre-clerigos',
      destId: 'casa-da-musica',
      rewardCash: 430,
      miniGameKind: 'medical_triage',
      miniGameTitle: 'Triagem & Estabilização Cardíaca',
      miniGameSubtitle: 'Prima Estabilizar quando o pulso passar na faixa verde (3x).',
      npcName: 'Sr. António Neves',
      npcRole: 'Cidadão Assistido',
      npcColor: '#F43F5E',
      npcGreeting:
        'Senti uma tontura forte depois de subir os degraus dos Clérigos… obrigado por virem rápido!',
      npcOptions: [
        {
          label: 'Acalmar o utente e medir pressão arterial',
          reply: 'Já me sinto muito mais tranquilo com a equipa do INEM.',
          cashBonus: 95,
          repBonus: 14,
        },
        {
          label: 'Iniciar protocolo de monitorização imediata',
          reply: 'Siga as suas indicações, doutor.',
          cashBonus: 60,
          repBonus: 9,
        },
      ],
    },
    {
      scenarioId: 'bolhao_gaia',
      title: 'Socorro na Ribeira/Gaia: Bolhão → Caves de Gaia',
      goText: 'Responda a uma chamada 112 junto ao Mercado do Bolhão.',
      deliverText: 'Conduza em marcha suave até ao posto médico em Gaia.',
      sourceId: 'mercado-bolhao',
      destId: 'caves-sandeman',
      rewardCash: 450,
      miniGameKind: 'medical_triage',
      miniGameTitle: 'Avaliação Clínica INEM',
      miniGameSubtitle: 'Sincronize 3 ciclos de oxigenação sem falhar o ritmo.',
      npcName: 'Enf.ª Mariana Costa',
      npcRole: 'Equipa de Apoio Local',
      npcColor: '#F43F5E',
      npcGreeting:
        'Um turista sofreu uma queda leve perto das escadas. Precisamos de estabilizar os sinais vitais!',
      npcOptions: [
        {
          label: 'Imobilizar tornozelo e aplicar gelo clínico',
          reply: 'Procedimento exemplar, pronto para transporte seguro.',
          cashBonus: 100,
          repBonus: 14,
        },
        {
          label: 'Preparar maca de transporte direto',
          reply: 'Equipa pronta para atravessar a ponte.',
          cashBonus: 65,
          repBonus: 8,
        },
      ],
    },
  ],
  psp: [
    {
      scenarioId: 'camara_se',
      title: 'Patrulha PSP: Aliados → Terreiro da Sé',
      goText: 'Desloque-se à Câmara Municipal para coordenar o turno de trânsito.',
      deliverText: 'Faça ronda preventiva pela Sé do Porto e fiscalize condutores.',
      sourceId: 'camara-municipal',
      destId: 'se-do-porto',
      rewardCash: 440,
      miniGameKind: 'psp_inspection',
      miniGameTitle: 'Controlo Radar & Documentação',
      miniGameSubtitle: 'Verifique velocidade, seguro e decida a ação policial justa.',
      npcName: 'Subcomissário Rocha',
      npcRole: 'Comando Metropolitano PSP',
      npcColor: '#38BDF8',
      npcGreeting:
        'Bom serviço, agente. Temos movimento intenso na Baixa e precisamos de fiscalização justa na Sé e Ponte.',
      npcOptions: [
        {
          label: 'Priorizar prevenção rodoviária e diálogo cívico',
          reply: 'A cidade agradece uma presença próxima e respeitadora.',
          cashBonus: 90,
          repBonus: 12,
        },
        {
          label: 'Ativar radar de velocidade na descida da Baixa',
          reply: 'Radar calibrado. Pode abordar infratores ou condutores no caminho.',
          cashBonus: 70,
          repBonus: 8,
        },
      ],
    },
    {
      scenarioId: 'bolhao_gaia',
      title: 'Fiscalização Ponte Dom Luís I: Bolhão → Gaia',
      goText: 'Verifique o fluxo de trânsito no eixo Mercado do Bolhão.',
      deliverText: 'Complete o ponto de controlo na travessia para Gaia (Caves).',
      sourceId: 'mercado-bolhao',
      destId: 'caves-sandeman',
      rewardCash: 470,
      miniGameKind: 'psp_inspection',
      miniGameTitle: 'Operação Stop na Ribeira / Gaia',
      miniGameSubtitle: 'Inspecione o registo do veículo e aplique aviso ou coima.',
      npcName: 'Chefe Duarte Almeida',
      npcRole: 'Brigada de Trânsito',
      npcColor: '#38BDF8',
      npcGreeting:
        'Recebemos alertas de velocidade acima de 95 km/h junto à Ribeira. Vamos inspecionar o condutor?',
      npcOptions: [
        {
          label: 'Fazer operação stop educativa junto ao cais',
          reply: 'Excelente abordagem comunitária.',
          cashBonus: 95,
          repBonus: 11,
        },
        {
          label: 'Aplicar rigor total contra excesso de velocidade',
          reply: 'Equipas prontas para registar autos na ponte.',
          cashBonus: 75,
          repBonus: 9,
        },
      ],
    },
  ],
};
