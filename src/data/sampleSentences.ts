import { SentenceItem } from './types';

/**
 * Pre-cached natural Slovenian sentences using high-frequency vocabulary.
 * Serves as an immediate offline cache and reliable fallback.
 */
export const SAMPLE_SENTENCES: SentenceItem[] = [
  {
    id: 's0a',
    sl: 'To je dobro.',
    en: 'This is good.',
    targets: ['to', 'je', 'dobro', 'biti']
  },
  {
    id: 's0b',
    sl: 'Jaz sem tu.',
    en: 'I am here.',
    targets: ['jaz', 'sem', 'tu', 'biti']
  },
  {
    id: 's0c',
    sl: 'Kaj je to?',
    en: 'What is this?',
    targets: ['kaj', 'je', 'to', 'biti']
  },
  {
    id: 's0d',
    sl: 'Kdo je tam?',
    en: 'Who is there?',
    targets: ['kdo', 'je', 'tam', 'biti']
  },
  {
    id: 's0e',
    sl: 'To ni res.',
    en: 'This is not true.',
    targets: ['to', 'ni', 'res', 'biti']
  },
  {
    id: 's0f',
    sl: 'Pes in mačka.',
    en: 'Dog and cat.',
    targets: ['in', 'pes', 'mačka']
  },
  {
    id: 's0g',
    sl: 'Knjiga je na mizi.',
    en: 'The book is on the table.',
    targets: ['knjiga', 'biti', 'na', 'miza']
  },
  {
    id: 's0h',
    sl: 'Otrok se veselo smeje.',
    en: 'The child laughs cheerfully.',
    targets: ['otrok', 'se', 'smejati', 'vesel']
  },
  {
    id: 's0i',
    sl: 'To je za tebe.',
    en: 'This is for you.',
    targets: ['to', 'biti', 'za', 'ti']
  },
  {
    id: 's0j',
    sl: 'Kje je on zdaj?',
    en: 'Where is he now?',
    targets: ['kje', 'biti', 'on', 'zdaj']
  },
  {
    id: 's0k',
    sl: 'Ali imaš čas za kavo?',
    en: 'Do you have time for coffee?',
    targets: ['ali', 'imeti', 'čas', 'za', 'kava']
  },
  {
    id: 's0l',
    sl: 'Jaz sem zelo vesel.',
    en: 'I am very glad.',
    targets: ['jaz', 'sem', 'zelo', 'vesel', 'biti']
  },
  {
    id: 's0m',
    sl: 'Jaz živim v mestu.',
    en: 'I live in the city.',
    targets: ['jaz', 'živeti', 'v', 'mesto']
  },
  {
    id: 's1',
    sl: 'Jaz imam nov avto.',
    en: 'I have a new car.',
    targets: ['imeti', 'nov', 'avto', 'jaz']
  },
  {
    id: 's2',
    sl: 'Kje je tvoja hiša?',
    en: 'Where is your house?',
    targets: ['kje', 'biti', 'tvoj', 'hiša']
  },
  {
    id: 's3',
    sl: 'Danes je zelo lep dan.',
    en: 'Today is a very beautiful day.',
    targets: ['danes', 'biti', 'zelo', 'lep', 'dan']
  },
  {
    id: 's4',
    sl: 'Mi pijemo vodo in čaj.',
    en: 'We drink water and tea.',
    targets: ['mi', 'piti', 'voda', 'in', 'čaj']
  },
  {
    id: 's5',
    sl: 'Ona bere dobro knjigo.',
    en: 'She reads a good book.',
    targets: ['ona', 'brati', 'dober', 'knjiga']
  },
  {
    id: 's6',
    sl: 'Moj prijatelj dela v mestu.',
    en: 'My friend works in the city.',
    targets: ['moj', 'prijatelj', 'delati', 'v', 'mesto']
  },
  {
    id: 's7',
    sl: 'Ali govoriš slovenski jezik?',
    en: 'Do you speak the Slovenian language?',
    targets: ['ali', 'govoriti', 'jezik']
  },
  {
    id: 's8',
    sl: 'To je res velika stvar.',
    en: 'This is really a big thing.',
    targets: ['to', 'biti', 'res', 'velik', 'stvar']
  },
  {
    id: 's9',
    sl: 'Otrok se veselo smeje.',
    en: 'The child laughs cheerfully.',
    targets: ['otrok', 'se', 'smejati', 'vesel']
  },
  {
    id: 's10',
    sl: 'Jaz ne vem odgovora.',
    en: 'I do not know the answer.',
    targets: ['jaz', 'ne', 'vedeti', 'odgovor']
  },
  {
    id: 's11',
    sl: 'Jutri gremo hitro na vlak.',
    en: 'Tomorrow we go quickly to the train.',
    targets: ['jutri', 'iti', 'hitro', 'na', 'vlak']
  },
  {
    id: 's12',
    sl: 'Pes in mačka spita.',
    en: 'The dog and the cat sleep.',
    targets: ['pes', 'in', 'mačka', 'spati']
  },
  {
    id: 's13',
    sl: 'Kdaj pride tvoja družina?',
    en: 'When is your family arriving?',
    targets: ['kdaj', 'priti', 'tvoj', 'družina']
  },
  {
    id: 's14',
    sl: 'Oni gledajo novo sliko.',
    en: 'They look at the new picture.',
    targets: ['oni', 'gledati', 'nov', 'slika']
  },
  {
    id: 's15',
    sl: 'Ali imaš čas za kavo?',
    en: 'Do you have time for coffee?',
    targets: ['imeti', 'čas', 'za', 'kava']
  },
  {
    id: 's16',
    sl: 'Voda v jezeru je hladna.',
    en: 'The water in the lake is cold.',
    targets: ['voda', 'v', 'jezero', 'hladen']
  },
  {
    id: 's17',
    sl: 'Zvečer poslušam lepo glasbo.',
    en: 'In the evening I listen to beautiful music.',
    targets: ['zvečer', 'poslušati', 'lep', 'glasba']
  },
  {
    id: 's18',
    sl: 'V sobi stoji velika miza.',
    en: 'A large table stands in the room.',
    targets: ['v', 'soba', 'stati', 'velik', 'miza']
  },
  {
    id: 's19',
    sl: 'Vsak dan se učim slovensko.',
    en: 'Every day I learn Slovenian.',
    targets: ['vsak', 'dan', 'se', 'učiti']
  },
  {
    id: 's20',
    sl: 'Ali lahko odpreš okno?',
    en: 'Can you open the window?',
    targets: ['lahko', 'odpreti', 'okno']
  },
  {
    id: 's21',
    sl: 'Oče in mati živita tukaj.',
    en: 'Father and mother live here.',
    targets: ['oče', 'in', 'mati', 'živeti', 'tukaj']
  },
  {
    id: 's22',
    sl: 'Moja sestra piše pismo.',
    en: 'My sister is writing a letter.',
    targets: ['moj', 'sestra', 'pisati', 'pismo']
  },
  {
    id: 's23',
    sl: 'Kruh in sir sta na mizi.',
    en: 'Bread and cheese are on the table.',
    targets: ['kruh', 'in', 'sir', 'biti', 'na', 'miza']
  },
  {
    id: 's24',
    sl: 'Mesto ima zelo lep park.',
    en: 'The city has a very nice park.',
    targets: ['mesto', 'imeti', 'zelo', 'lep']
  },
  {
    id: 's25',
    sl: 'On želi kupiti novo hišo.',
    en: 'He wants to buy a new house.',
    targets: ['on', 'želeti', 'kupiti', 'nov', 'hiša']
  }
];
