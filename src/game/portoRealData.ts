import aliadosPhoto from '../assets/images/porto_aliados_street_1795724214009.jpg';
import clerigosPhoto from '../assets/images/porto_clerigos_street_1795724215041.jpg';
import facadePhoto from '../assets/images/porto_granite_facade_1795724213215.jpg';
import ribeiraPhoto from '../assets/images/porto_ribeira_cover_1795723506648.jpg';
import saoBentoPhoto from '../assets/images/porto_saobento_ribeira_1795724214851.jpg';

export interface PortoRealPlace {
  buildingId: string;
  name: string;
  streetAddress: string;
  coordinates: string;
  era: string;
  photoUrl: string;
  photoCaption: string;
  description: string;
  highlights: string[];
}

export const PORTO_REAL_PLACES: PortoRealPlace[] = [
  {
    buildingId: 'camara-municipal',
    name: 'Câmara Municipal & Avenida dos Aliados',
    streetAddress: 'Praça General Humberto Delgado, 4049-001 Porto',
    coordinates: '41.1496° N, 8.6108° W',
    era: '1920–1957 · Estilo Beaux-Arts',
    photoUrl: aliadosPhoto,
    photoCaption: 'Avenida dos Aliados com a torre da Câmara Municipal, calçada portuguesa e elétrico histórico.',
    description:
      'O coração cívico da cidade do Porto. Ladeada por palacetes em granito lavrado e passeios em calçada portuguesa de ondas pretas e brancas, culmina na torre sineira de 70 metros da Câmara Municipal.',
    highlights: [
      'Torre central com carrilhão de relógio sobre a Praça da Liberdade',
      'Calçada Portuguesa tradicional em basalto e calcário em toda a placa central',
      'Ligação direta à linha dos elétricos históricos e à Baixa portuense',
    ],
  },
  {
    buildingId: 'torre-clerigos',
    name: 'Torre e Igreja dos Clérigos',
    streetAddress: 'Rua de São Filipe de Nery, 4050-546 Porto',
    coordinates: '41.1458° N, 8.6146° W',
    era: '1754–1763 · Barroco (Nicolau Nasoni)',
    photoUrl: clerigosPhoto,
    photoCaption: 'Torre dos Clérigos ao entardecer vista da Rua das Carmelitas com o elétrico e Livraria Lello.',
    description:
      'O ex-líbris do horizonte portuense. Com 75 metros de altura em granito esculpido por Nicolau Nasoni, domina a zona histórica e oferece uma vista panorâmica de 360 graus sobre o Porto e o Douro.',
    highlights: [
      '225 degraus até ao campanário barroco com 49 sinos',
      'Situada entre o Passeio dos Clérigos e o Jardim da Cordoaria',
      'Marco de orientação marítima histórica para barcos no Rio Douro',
    ],
  },
  {
    buildingId: 'livraria-lello',
    name: 'Livraria Lello',
    streetAddress: 'Rua das Carmelitas 144, 4050-161 Porto',
    coordinates: '41.1468° N, 8.6149° W',
    era: '1906 · Neogótico & Arte Nova',
    photoUrl: clerigosPhoto,
    photoCaption: 'Fachada neogótica da Livraria Lello na Rua das Carmelitas junto ao elétrico 18.',
    description:
      'Considerada uma das livrarias mais belas do mundo, destaca-se pela fachada em pedra lavrada com pináculos neogóticos, vitral no teto e a famosa escadaria dupla carmesim em madeira entalhada.',
    highlights: [
      'Escadaria icónica em madeira com corrimão ondulado e degraus vermelhos',
      'Vitral colorido com o lema "Decus in Labore" no salão principal',
      'Vizinha direta da Igreja do Carmo e da Torre dos Clérigos',
    ],
  },
  {
    buildingId: 'estacao-sao-bento',
    name: 'Estação de São Bento',
    streetAddress: 'Praça Almeida Garrett, 4000-069 Porto',
    coordinates: '41.1456° N, 8.6104° W',
    era: '1904–1916 · Beaux-Arts & Azulejaria',
    photoUrl: saoBentoPhoto,
    photoCaption: 'Átrio monumental da Estação de São Bento com painéis de 20.000 azulejos e saída para a rua.',
    description:
      'Construída sobre o antigo Convento de São Bento de Avé-Maria, o seu átrio é famoso em todo o mundo pelos mais de 20.000 azulejos azuis e brancos pintados à mão por Jorge Colaço.',
    highlights: [
      'Painéis históricos da Batalha de Valdevez, Egas Moniz e Conquista de Ceuta',
      'Cobertura em ferro e vidro sobre a entrada em granito da Praça Almeida Garrett',
      'Ligação pedonal imediata à Sé do Porto e à Avenida dos Aliados',
    ],
  },
  {
    buildingId: 'cais-da-ribeira',
    name: 'Cais da Ribeira & Ponte Dom Luís I',
    streetAddress: 'Cais da Ribeira, 4050-511 Porto',
    coordinates: '41.1404° N, 8.6128° W',
    era: 'Património Mundial UNESCO · Sécs. XIV–XIX',
    photoUrl: ribeiraPhoto,
    photoCaption: 'Frente ribeirinha da Ribeira com casas coloridas, barcos rabelos e a Ponte Dom Luís I.',
    description:
      'A zona mais emblemática junto ao Rio Douro: fachadas estreitas e coloridas revestidas a azulejo, arcadas de granito com esplanadas, barcos rabelos atracados e o arco duplo de ferro da Ponte Dom Luís I.',
    highlights: [
      'Ponte Dom Luís I (1886) desenhada por Théophile Seyrig com dois tabuleiros',
      'Tabuleiro inferior liga o Cais da Ribeira diretamente ao Cais de Gaia',
      'Casario tradicional classificado pela UNESCO desde 1996',
    ],
  },
  {
    buildingId: 'mercado-bolhao',
    name: 'Mercado do Bolhão',
    streetAddress: 'Rua Formosa 322, 4000-249 Porto',
    coordinates: '41.1494° N, 8.6068° W',
    era: '1914 · Arquitetura Neoclássica',
    photoUrl: facadePhoto,
    photoCaption: 'Arquitetura tradicional portuense em granito, varandas de ferro forjado e azulejos.',
    description:
      'Mercado histórico de planta quadrangular a céu aberto com galerias em ferro fundido, bancas de produtos frescos do Norte, flores, queijos e vinhos no centro da Baixa portuense.',
    highlights: [
      'Quatro fachadas em granito com entradas para Rua Formosa e Rua Sá da Bandeira',
      'Pátio central ao ar livre cercado por dois pisos de galerias comerciais',
      'A dois passos da Rua de Santa Catarina e do Café Majestic',
    ],
  },
  {
    buildingId: 'palacio-da-bolsa',
    name: 'Palácio da Bolsa',
    streetAddress: 'Rua Ferreira Borges, 4050-253 Porto',
    coordinates: '41.1414° N, 8.6156° W',
    era: '1842–1910 · Neoclássico & Salão Árabe',
    photoUrl: facadePhoto,
    photoCaption: 'Fachada nobre em cantaria de granito e varandins de ferro trabalhado do centro histórico.',
    description:
      'Sede da Associação Comercial do Porto, erguida sobre as ruínas do Convento de São Francisco. Alberga o Pátio das Nações com cúpula de vidro e o deslumbrante Salão Árabe em talha dourada.',
    highlights: [
      'Pátio das Nações iluminado por uma cúpula octogonal em ferro e vidro',
      'Salão Árabe inspirado na Alhambra com 18 anos de trabalho artesanal',
      'Situado na Praça do Infante Dom Henrique junto à Igreja de São Francisco',
    ],
  },
  {
    buildingId: 'se-do-porto',
    name: 'Sé do Porto (Catedral)',
    streetAddress: 'Terreiro da Sé, 4050-573 Porto',
    coordinates: '41.1429° N, 8.6111° W',
    era: 'Séc. XII · Românico & Barroco',
    photoUrl: ribeiraPhoto,
    photoCaption: 'Vista sobre o casario histórico entre a Sé do Porto, o Terreiro da Sé e o Rio Douro.',
    description:
      'Igreja-fortaleza medieval no ponto mais alto da cidade velha, com duas torres ameias, rosácea românica, claustro gótico forrado a azulejos e miradouro direto sobre a Ribeira.',
    highlights: [
      'Claustro gótico revestido a grandes painéis de azulejo azul e branco',
      'Terreiro da Sé em lajes de granito com vista privilegiada sobre o Porto',
      'Ponto de partida oficial do Caminho Português de Santiago no Porto',
    ],
  },
  {
    buildingId: 'casa-da-musica',
    name: 'Casa da Música',
    streetAddress: 'Avenida da Boavista 604-610, 4149-071 Porto',
    coordinates: '41.1589° N, 8.6307° W',
    era: '2005 · Arquitetura Contemporânea (Rem Koolhaas)',
    photoUrl: aliadosPhoto,
    photoCaption: 'Eixo urbano moderno entre a Avenida da Boavista e a Baixa do Porto.',
    description:
      'Ícone da arquitetura contemporânea mundial na Rotunda da Boavista: um poliedro assimétrico em betão branco com grandes fachadas de vidro ondulado e acústica de referência no Auditório Suggia.',
    highlights: [
      'Sala Suggia com 1.238 lugares e paredes revestidas a madeira folheada a ouro',
      'Praça exterior em travertino usada diariamente por cidadãos e skaters',
      'Ligação direta à Avenida da Boavista até à Foz do Douro',
    ],
  },
  {
    buildingId: 'caves-sandeman',
    name: 'Caves Sandeman · Cais de Gaia',
    streetAddress: 'Largo Miguel Bombarda 3, 4430-175 Vila Nova de Gaia',
    coordinates: '41.1376° N, 8.6126° W',
    era: '1790 · Armazéns de Vinho do Porto',
    photoUrl: ribeiraPhoto,
    photoCaption: 'Margem sul do Rio Douro em Vila Nova de Gaia vista a partir do Cais da Ribeira.',
    description:
      'Na margem sul do Douro, os armazéns centenários de granito e telha lusa guardam milhares de pipas de carvalho onde estagia o Vinho do Porto vindo das quintas do Alto Douro Vinhateiro.',
    highlights: [
      'Armazéns centenários em pedra com cobertura de telha portuguesa para microclima fresco',
      'Frente ao Cais da Ribeira, ligados pela travessia pedonal e rodoviária da Ponte Dom Luís I',
      'Ponto de descarga histórica dos barcos rabelos carregados de pipas',
    ],
  },
  {
    buildingId: 'caves-taylors',
    name: 'Caves Graham’s & Taylor’s (Gaia)',
    streetAddress: 'Rua do Choupelo 250, 4400-088 Vila Nova de Gaia',
    coordinates: '41.1342° N, 8.6143° W',
    era: '1692 / 1820 · Encosta de Gaia',
    photoUrl: ribeiraPhoto,
    photoCaption: 'Encosta histórica de Vila Nova de Gaia e vista panorâmica do Rio Douro.',
    description:
      'Situadas na encosta soalheira de Vila Nova de Gaia, preservam tonéis monumentais de carvalho centenário e terraços ajardinados com uma das vistas mais amplas para o casario do Porto.',
    highlights: [
      'Caves abobadadas em granito com temperaturas naturais estáveis todo o ano',
      'Varandas panorâmicas viradas diretamente para a Ponte Dom Luís I',
      'Património vivo da história do comércio do Vinho do Porto',
    ],
  },
  {
    buildingId: 'serra-do-pilar',
    name: 'Mosteiro da Serra do Pilar',
    streetAddress: 'Largo Aviz, 4430-329 Vila Nova de Gaia',
    coordinates: '41.1381° N, 8.6088° W',
    era: '1538–1672 · Maneirismo Circular Único',
    photoUrl: ribeiraPhoto,
    photoCaption: 'Vista clássica do Miradouro da Serra do Pilar sobre o arco da Ponte Dom Luís I e o Porto.',
    description:
      'Construído no topo do escarpado de Gaia, possui uma igreja e claustro de planta perfeitamente circular — exemplar único na Europa — e o miradouro mais famoso sobre a Ponte Dom Luís I.',
    highlights: [
      'Igreja circular coberta por cúpula semiesférica e zimbório visível de todo o Porto',
      'Claustro redondo com 36 colunas jónicas em granito da região',
      'Junto ao tabuleiro superior da Ponte Dom Luís I (Património UNESCO)',
    ],
  },
];

export function getPortoRealPlace(buildingId: string | null | undefined): PortoRealPlace {
  if (!buildingId) return PORTO_REAL_PLACES[0];
  return PORTO_REAL_PLACES.find((p) => p.buildingId === buildingId) ?? PORTO_REAL_PLACES[0];
}
