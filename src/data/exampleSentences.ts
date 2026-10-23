import { Word } from './types';
import { SAMPLE_SENTENCES } from './sampleSentences';
import { loadSentenceCache } from './storage';

/**
 * Curated, authentic Slovenian example sentences for high-frequency vocabulary.
 */
const CURATED_EXAMPLES: Record<number, { sl: string; en: string }> = {
  1: { sl: 'Pes in mačka spita.', en: 'The dog and cat are sleeping.' },
  2: { sl: 'To je zelo dobro.', en: 'This is very good.' },
  3: { sl: 'Otrok se veselo smeje.', en: 'The child laughs cheerfully.' },
  4: { sl: 'Knjiga je na mizi.', en: 'The book is on the table.' },
  5: { sl: 'Vem, da je to res.', en: 'I know that this is true.' },
  6: { sl: 'Prijatelji so tukaj.', en: 'Friends are here.' },
  7: { sl: 'Ne, tega ne vem.', en: 'No, I do not know this.' },
  8: { sl: 'To je kava za tebe.', en: 'This is coffee for you.' },
  9: { sl: 'Človek, ki tukaj dela.', en: 'The person who works here.' },
  10: { sl: 'Jaz pa sem tukaj.', en: 'And I am here.' },
  11: { sl: 'Kaj je to?', en: 'What is this?' },
  12: { sl: 'Hiša je velika kot gora.', en: 'The house is as big as a mountain.' },
  13: { sl: 'Hodimo po lepi poti.', en: 'We walk along a beautiful path.' },
  14: { sl: 'Jaz sem zelo vesel.', en: 'I am very glad.' },
  15: { sl: 'Jaz bi pil vodo.', en: 'I would like to drink water.' },
  16: { sl: 'Ali imaš čas za kavo?', en: 'Do you have time for coffee?' },
  17: { sl: 'Dobro jo poznam.', en: 'I know her well.' },
  18: { sl: 'Vsak dan ga vidim.', en: 'I see him every day.' },
  19: { sl: 'Kaj delaš danes?', en: 'What are you doing today?' },
  20: { sl: 'Družina živi v mestu.', en: 'The family lives in the city.' },
  21: { sl: 'Govorim z bratom.', en: 'I speak with my brother.' },
  22: { sl: 'Kruh s sirom.', en: 'Bread with cheese.' },
  23: { sl: 'Lepo je biti doma.', en: 'It is nice to be home.' },
  24: { sl: 'Jaz imam tudi psa.', en: 'I also have a dog.' },
  25: { sl: 'Smeje se, ko me vidi.', en: 'She smiles when she sees me.' },
  26: { sl: 'Jaz bi še malo čaja.', en: 'I would like some more tea.' },
  27: { sl: 'Vlak je že tukaj.', en: 'The train is already here.' },
  28: { sl: 'Delamo od jutra do večera.', en: 'We work from morning to evening.' },
  29: { sl: 'On prihaja iz mesta.', en: 'He comes from the city.' },
  30: { sl: 'Jutri bo lep dan.', en: 'Tomorrow will be a nice day.' },
  31: { sl: 'Kako si danes?', en: 'How are you today?' },
  32: { sl: 'Ta hiša je zelo stara.', en: 'This house is very old.' },
  33: { sl: 'Želim priti, ampak nimam časa.', en: 'I want to come, but I do not have time.' },
  34: { sl: 'Vesel sem, ker si tukaj.', en: 'I am glad because you are here.' },
  35: { sl: 'Če želiš, lahko greva skupaj.', en: 'If you want, we can go together.' },
  36: { sl: 'To je samo začetek.', en: 'This is only the beginning.' },
  37: { sl: 'Kdo je ta človek?', en: 'Who is this person?' },
  38: { sl: 'Zdaj moramo iti.', en: 'Now we have to go.' },
  39: { sl: 'Jaz imam novo knjigo.', en: 'I have a new book.' },
  40: { sl: 'Jaz živim v lepi hiši.', en: 'I live in a beautiful house.' },
  41: { sl: 'On me dobro pozna.', en: 'He knows me well.' },
  42: { sl: 'Mi se učimo slovensko.', en: 'We are learning Slovenian.' },
  43: { sl: 'Ali ti govoriš angleško?', en: 'Do you speak English?' },
  44: { sl: 'On ima velik avto.', en: 'He has a big car.' },
  45: { sl: 'Ona zelo lepo bere.', en: 'She reads very nicely.' },
  46: { sl: 'Tako je prav.', en: 'That is the right way.' },
  47: { sl: 'Ali lahko odpreš okno?', en: 'Can you open the window?' },
  48: { sl: 'Pismo od mojega prijatelja.', en: 'A letter from my friend.' },
  49: { sl: 'Kupil si je novo uro.', en: 'He bought himself a new watch.' },
  50: { sl: 'Ves dan sem delal.', en: 'I worked the whole day.' },
  53: { sl: 'Danes ni sonca.', en: 'There is no sun today.' },
  55: { sl: 'To je moj najboljši prijatelj.', en: 'This is my best friend.' },
  56: { sl: 'Voda je zelo hladna.', en: 'The water is very cold.' },
  57: { sl: 'Kdaj pride vlak?', en: 'When is the train arriving?' },
  59: { sl: 'Kje je tvoj dom?', en: 'Where is your home?' },
  60: { sl: 'Tukaj živi veliko ljudi.', en: 'A lot of people live here.' },
  61: { sl: 'Ta človek je zelo prijazen.', en: 'This person is very kind.' },
  62: { sl: 'Novo leto je pred vrati.', en: 'The New Year is at the door.' },
  63: { sl: 'Danes je čudovit dan.', en: 'Today is a wonderful day.' },
  64: { sl: 'Imamo dovolj časa.', en: 'We have enough time.' },
  65: { sl: 'Vem kje živiš.', en: 'I know where you live.' },
  69: { sl: 'To je zelo dobro.', en: 'This is very good.' },
  74: { sl: 'Čas je, da gremo.', en: 'It is time for us to go.' },
  75: { sl: 'Rad bi vedel resnico.', en: 'I would like to know the truth.' },
  76: { sl: 'Moj oče rad dela na vrtu.', en: 'My father likes to work in the garden.' },
  77: { sl: 'Ali mi lahko daš vodo?', en: 'Can you give me water?' },
  78: { sl: 'Lepo te je videti.', en: 'It is nice to see you.' },
  79: { sl: 'Jutri bomo prišli k vam.', en: 'Tomorrow we will come to you.' },
  80: { sl: 'Nič ni narobe.', en: 'Nothing is wrong.' },
  87: { sl: 'Kje je tvoja hiša?', en: 'Where is your house?' },
  90: { sl: 'Kdo je tam?', en: 'Who is there?' },
  91: { sl: 'Jaz sem tu.', en: 'I am here.' },
  92: { sl: 'Živimo tukaj.', en: 'We live here.' },
  104: { sl: 'Danes je lep dan.', en: 'Today is a beautiful day.' },
  105: { sl: 'Jutri se spet vidimo.', en: 'We will see each other again tomorrow.' },
  106: { sl: 'Včeraj je bil dež.', en: 'Yesterday there was rain.' },
  108: { sl: 'To je dober začetek.', en: 'This is a good start.' },
  109: { sl: 'Mesto ima velik park.', en: 'The city has a big park.' },
  110: { sl: 'Majhen pes teče po travi.', en: 'A small dog is running on the grass.' },
  111: { sl: 'Kupil sem nov telefon.', en: 'I bought a new phone.' },
  112: { sl: 'To je star grad.', en: 'This is an old castle.' },
  121: { sl: 'Delo je končano.', en: 'The work is finished.' },
  126: { sl: 'Ljubljana je lepo mesto.', en: 'Ljubljana is a beautiful city.' },
  130: { sl: 'Pijem svežo vodo.', en: 'I drink fresh water.' },
  131: { sl: 'Naša hiša ima velik vrt.', en: 'Our house has a big garden.' },
  139: { sl: 'On je moj dober prijatelj.', en: 'He is my good friend.' },
  141: { sl: 'Vsaka slovenska beseda šteje.', en: 'Every Slovenian word counts.' },
  163: { sl: 'Zvečer rad berem knjigo.', en: 'In the evening I like reading a book.' },
  180: { sl: 'Družina je kosilo.', en: 'The family is eating lunch.' },
  181: { sl: 'Otrok pije mleko.', en: 'The child drinks milk.' },
  241: { sl: 'Svež kruh lepo diši.', en: 'Fresh bread smells nice.' },
  243: { sl: 'Zjutraj pijem črno kavo.', en: 'In the morning I drink black coffee.' },
  251: { sl: 'Njegov avto je rdeč.', en: 'His car is red.' }
};

/**
 * Returns a natural, grammatically correct Slovenian sentence with English translation for a word.
 */
export function getExampleSentenceForWord(word: Word): { sl: string; en: string } {
  // 1. Direct curated match
  if (CURATED_EXAMPLES[word.rank]) {
    return CURATED_EXAMPLES[word.rank];
  }

  // 2. Search local cached & sample sentences using exact whole-word matching
  const allSentences = [...loadSentenceCache(), ...SAMPLE_SENTENCES];
  const wordSl = word.sl.toLowerCase();
  const wordRegex = new RegExp(`\\b${wordSl}\\b`, 'i');
  const found = allSentences.find(s =>
    s.targets.map(t => t.toLowerCase()).includes(wordSl) ||
    wordRegex.test(s.sl)
  );

  if (found) {
    return { sl: found.sl, en: found.en };
  }

  // 3. Fallback based on part of speech:
  const firstMeaning = word.en.split(';')[0].replace(/\([^)]*\)/g, '').trim().toLowerCase();

  if (word.sl.endsWith('ti') || word.sl.endsWith('či')) {
    // Infinitive verb
    return {
      sl: `Jaz želim ${word.sl}.`,
      en: `I want ${firstMeaning}.`,
    };
  }

  if (word.isGrammarWord) {
    return {
      sl: `To je dobro za nas.`,
      en: `This is good for us.`,
    };
  }

  // Concrete noun or adjective
  return {
    sl: `Kje je ${word.sl}?`,
    en: `Where is the ${firstMeaning}?`,
  };
}
