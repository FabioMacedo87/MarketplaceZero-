import type { MissionScenarioId, StoryLine } from './types.ts';

export interface StoryChapter {
  chapterNumber: number;
  scenarioId: MissionScenarioId;
  title: string;
  subtitle: string;
  districtTag: string;
  synopsis: string;
  spawnGuards: number;
  introLines: StoryLine[];
  midLines: StoryLine[];
  outroLines: StoryLine[];
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    chapterNumber: 1,
    scenarioId: 'saobento_bolsa',
    title: 'Capítulo 1 · Chegada aos Aliados',
    subtitle: 'Os Azulejos de São Bento',
    districtTag: 'Praça Almeida Garrett → Palácio da Bolsa',
    synopsis:
      'Lucía e Jason começam uma nova vida profissional no Porto. Tiago apresenta-lhes a rede comercial da Baixa entre a Estação de São Bento e o Palácio da Bolsa.',
    spawnGuards: 0,
    introLines: [
      {
        speaker: 'tiago',
        speakerName: 'Tiago "O Barqueiro"',
        role: 'Contacto da Ribeira',
        accentHex: '#38BDF8',
        text: 'Bem-vindos ao Porto! Aqui cada um constrói a sua carreira — podem trabalhar na PSP, Táxi, Estafeta, Comércio ou INEM.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Queremos começar pelo trabalho honesto na cidade. Qual é o primeiro contacto em São Bento?',
      },
      {
        speaker: 'tiago',
        speakerName: 'Tiago "O Barqueiro"',
        role: 'Contacto da Ribeira',
        accentHex: '#38BDF8',
        text: 'Passem pelo átrio da Estação de São Bento, falem com o responsável e levem o dossier até ao Palácio da Bolsa.',
      },
    ],
    midLines: [
      {
        speaker: 'jason',
        speakerName: 'Jason Mercer',
        role: 'Parceiro',
        accentHex: '#0EA5E9',
        text: 'Documentação conferida com sucesso! Agora seguimos com calma pela Baixa até ao Palácio da Bolsa.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Respeita os limites de velocidade se houver agentes da PSP em patrulha na sala!',
      },
    ],
    outroLines: [
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Acordo assinado no Salão Árabe. O nosso nome já começa a ser respeitado no Porto.',
      },
    ],
  },
  {
    chapterNumber: 2,
    scenarioId: 'clerigos_musica',
    title: 'Capítulo 2 · Rotas da Boavista',
    subtitle: 'Dos Clérigos à Casa da Música',
    districtTag: 'Torre dos Clérigos → Casa da Música',
    synopsis:
      'Um evento cultural exige coordenação entre o centro histórico dos Clérigos e a Casa da Música na Rotunda da Boavista.',
    spawnGuards: 0,
    introLines: [
      {
        speaker: 'jason',
        speakerName: 'Jason Mercer',
        role: 'Parceiro',
        accentHex: '#0EA5E9',
        text: 'A organização do festival na Casa da Música pediu apoio logístico junto à Torre dos Clérigos.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Vamos confirmar o inventário nos Clérigos e subir pela Avenida da Boavista sem incidentes.',
      },
    ],
    midLines: [
      {
        speaker: 'tiago',
        speakerName: 'Tiago "O Barqueiro"',
        role: 'Contacto da Ribeira',
        accentHex: '#38BDF8',
        text: 'Equipamento verificado! Entreguem na Casa da Música para aumentar a vossa reputação cívica.',
      },
    ],
    outroLines: [
      {
        speaker: 'jason',
        speakerName: 'Jason Mercer',
        role: 'Parceiro',
        accentHex: '#0EA5E9',
        text: 'Espetáculo pronto na Casa da Música. A Dona Beatriz ligou a pedir ajuda no Bolhão.',
      },
    ],
  },
  {
    chapterNumber: 3,
    scenarioId: 'bolhao_gaia',
    title: 'Capítulo 3 · Ouro Líquido do Douro',
    subtitle: 'A Travessia da Ponte Dom Luís I',
    districtTag: 'Mercado do Bolhão → Caves Sandeman (Gaia)',
    synopsis:
      'Dona Beatriz do Bolhão confia-vos o transporte certificado de Vinho do Porto Vintage através da Ponte Dom Luís I até Vila Nova de Gaia.',
    spawnGuards: 0,
    introLines: [
      {
        speaker: 'beatriz',
        speakerName: 'Dona Beatriz',
        role: 'Comerciante do Bolhão',
        accentHex: '#10B981',
        text: 'Meninos, estas caixas centenárias têm de ser seladas no mercado e levadas inteiras até Gaia.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Cuidamos da selagem no Bolhão e atravessamos a Ponte Dom Luís I com toda a segurança.',
      },
    ],
    midLines: [
      {
        speaker: 'tiago',
        speakerName: 'Tiago "O Barqueiro"',
        role: 'Contacto da Ribeira',
        accentHex: '#38BDF8',
        text: 'Atenção à descida da ponte para o Cais de Gaia — evitem colisões para manter os 12 pontos na carta!',
      },
    ],
    outroLines: [
      {
        speaker: 'beatriz',
        speakerName: 'Dona Beatriz',
        role: 'Comerciante do Bolhão',
        accentHex: '#10B981',
        text: 'As Caves Sandeman receberam tudo intacto! Excelente profissionalismo.',
      },
    ],
  },
  {
    chapterNumber: 4,
    scenarioId: 'camara_se',
    title: 'Capítulo 4 · Serviço Cívico nos Aliados',
    subtitle: 'Alvarás na Câmara Municipal',
    districtTag: 'Câmara Municipal → Sé do Porto',
    synopsis:
      'A Câmara Municipal dos Aliados coordena licenças, patrulhas da PSP e serviços culturais entre a Avenida dos Aliados e o Terreiro da Sé.',
    spawnGuards: 0,
    introLines: [
      {
        speaker: 'jason',
        speakerName: 'Jason Mercer',
        role: 'Parceiro',
        accentHex: '#0EA5E9',
        text: 'Na Câmara Municipal podemos registar a nossa atividade comercial e trocar de profissão sempre que quisermos.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Validamos os registos nos Aliados e seguimos até ao Terreiro da Sé para concluir a visita.',
      },
    ],
    midLines: [
      {
        speaker: 'matos',
        speakerName: 'Inspectora Matos',
        role: 'Coordenação Municipal',
        accentHex: '#F59E0B',
        text: 'Documentação em ordem! Bom trabalho a contribuir para a ordem e economia do Porto.',
      },
    ],
    outroLines: [
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Tudo aprovado no claustro da Sé. Só falta a rota final na Serra do Pilar.',
      },
    ],
  },
  {
    chapterNumber: 5,
    scenarioId: 'lello_musica',
    title: 'Capítulo 5 · Miradouro do Douro',
    subtitle: 'Da Livraria Lello à Serra do Pilar',
    districtTag: 'Livraria Lello → Mosteiro da Serra do Pilar',
    synopsis:
      'O manuscrito histórico do Porto segue da Livraria Lello até ao alto do Mosteiro da Serra do Pilar, coroando a carreira na cidade.',
    spawnGuards: 0,
    introLines: [
      {
        speaker: 'tiago',
        speakerName: 'Tiago "O Barqueiro"',
        role: 'Contacto da Ribeira',
        accentHex: '#38BDF8',
        text: 'Chegámos ao capítulo final da campanha! Recolham a edição histórica na Livraria Lello.',
      },
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Levamo-la até à Serra do Pilar, com vista sobre o Rio Douro e toda a cidade viva!',
      },
    ],
    midLines: [
      {
        speaker: 'jason',
        speakerName: 'Jason Mercer',
        role: 'Parceiro',
        accentHex: '#0EA5E9',
        text: 'Carga protegida! Atravessa a ponte e sobe até ao miradouro de Gaia.',
      },
    ],
    outroLines: [
      {
        speaker: 'lucia',
        speakerName: 'Lucía Valente',
        role: 'Protagonista',
        accentHex: '#F43F5E',
        text: 'Da Ribeira até Gaia… construímos uma verdadeira vida no Porto, Jason. Sem limites.',
      },
    ],
  },
];

export function getStoryChapterByScenario(scenarioId: MissionScenarioId): StoryChapter {
  return STORY_CHAPTERS.find((c) => c.scenarioId === scenarioId) ?? STORY_CHAPTERS[0];
}

export function getStoryChapterByNumber(num: number): StoryChapter {
  return STORY_CHAPTERS.find((c) => c.chapterNumber === num) ?? STORY_CHAPTERS[0];
}
