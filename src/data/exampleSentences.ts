import { Word, Language } from './types';
import { SAMPLE_SENTENCES } from './sampleSentences';
import { SAMPLE_SENTENCES_PT } from './sampleSentencesPt';
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
 * Curated, authentic European Portuguese (Portugal) example sentences for high-frequency vocabulary.
 */
const CURATED_PT_EXAMPLES: Record<number, { sl: string; en: string }> = {
  1: { sl: 'Eu venho de Portugal.', en: 'I come from Portugal.' },
  2: { sl: 'A casa é muito bonita.', en: 'The house is very pretty.' },
  3: { sl: 'O dia está solarengo.', en: 'The day is sunny.' },
  4: { sl: 'O que queres fazer hoje?', en: 'What do you want to do today?' },
  5: { sl: 'O cão e o gato brincam no jardim.', en: 'The dog and cat play in the garden.' },
  6: { sl: 'A chave do carro está na mesa.', en: 'The car key is on the table.' },
  7: { sl: 'A janela da sala está aberta.', en: 'The living room window is open.' },
  8: { sl: 'Nós estamos em Lisboa.', en: 'We are in Lisbon.' },
  9: { sl: 'Eu quero um café quente.', en: 'I want a hot coffee.' },
  10: { sl: 'Isto é para ti com carinho.', en: 'This is for you with care.' },
  11: { sl: 'Hoje é um ótimo dia.', en: 'Today is a great day.' },
  12: { sl: 'Eu vou com os meus amigos.', en: 'I am going with my friends.' },
  13: { sl: 'Eu não sei a resposta certa.', en: 'I do not know the right answer.' },
  14: { sl: 'Ela comprou uma maçã vermelha.', en: 'She bought a red apple.' },
  15: { sl: 'Os livros estão na estante.', en: 'The books are on the bookshelf.' },
  16: { sl: 'O almoço está no forno.', en: 'Lunch is in the oven.' },
  17: { sl: 'Ele senta-se no banco da praça.', en: 'He sits on the bench in the square.' },
  18: { sl: 'Nós estamos na praia agora.', en: 'We are at the beach now.' },
  19: { sl: 'Obrigado por tudo o que fizeste.', en: 'Thank you for everything you did.' },
  20: { sl: 'Quero saber mais sobre este assunto.', en: 'I want to know more about this matter.' },
  21: { sl: 'As crianças brincam felizes no parque.', en: 'The children play happily in the park.' },
  22: { sl: 'A opinião dos especialistas é clara.', en: 'The opinion of the specialists is clear.' },
  23: { sl: 'Como estás hoje meu amigo?', en: 'How are you today my friend?' },
  24: { sl: 'Eu queria ir, mas tenho de trabalhar.', en: 'I wanted to go, but I have to work.' },
  25: { sl: 'Vamos ao cinema ver um filme novo.', en: 'Let us go to the cinema to see a new film.' },
  26: { sl: 'Ele é uma pessoa muito generosa.', en: 'He is a very generous person.' },
  27: { sl: 'O cheiro das flores é maravilhoso.', en: 'The smell of the flowers is wonderful.' },
  28: { sl: 'Nós vamos à pastelaria tomar café.', en: 'We are going to the pastry shop to have coffee.' },
  29: { sl: 'O seu trabalho é muito importante.', en: 'Your work is very important.' },
  30: { sl: 'A sua dedicação é exemplar.', en: 'Her dedication is exemplary.' },
  31: { sl: 'Queres chá ou café com leite?', en: 'Do you want tea or coffee with milk?' },
  32: { sl: 'Ser feliz é o mais importante.', en: 'Being happy is the most important thing.' },
  33: { sl: 'Quando chegas a casa hoje?', en: 'When do you arrive home today?' },
  34: { sl: 'Muito obrigado pela tua paciência.', en: 'Thank you very much for your patience.' },
  35: { sl: 'Ele deu-nos uma excelente notícia.', en: 'He gave us excellent news.' },
  36: { sl: 'Eu já terminei a tarefa diária.', en: 'I have already finished the daily task.' },
  37: { sl: 'O tempo está muito agradável.', en: 'The weather is very pleasant.' },
  38: { sl: 'Eu gosto de aprender coisas novas.', en: 'I like learning new things.' },
  39: { sl: 'Ele também vem connosco ao teatro.', en: 'He is also coming with us to the theatre.' },
  40: { sl: 'Só preciso de cinco minutos.', en: 'I only need five minutes.' },
  41: { sl: 'Ele caminha pelo calçadão.', en: 'He walks along the boardwalk.' },
  42: { sl: 'Nós passamos pela ponte antiga.', en: 'We crossed the old bridge.' },
  43: { sl: 'Fica aqui até amanhã de manhã.', en: 'Stay here until tomorrow morning.' },
  44: { sl: 'Isto é o que nós precisávamos.', en: 'This is what we needed.' },
  45: { sl: 'Ela fala português muito bem.', en: 'She speaks Portuguese very well.' },
  46: { sl: 'Há uma grande amizade entre nós.', en: 'There is a great friendship between us.' },
  47: { sl: 'Depois do almoço vamos passear.', en: 'After lunch we are going for a walk.' },
  48: { sl: 'Não saias de casa sem casaco.', en: 'Do not leave the house without a coat.' },
  49: { sl: 'Mesmo cansado, ele continuou.', en: 'Even though tired, he continued.' },
  50: { sl: 'Tens aos teus pés o mundo inteiro.', en: 'You have the whole world at your feet.' },
};

/**
 * Returns a natural, grammatically correct sentence with English translation for a word
 * in the selected target language ('sl' for Slovenian, 'pt' for Portuguese).
 */
export function getExampleSentenceForWord(
  word: Word,
  lang: Language = 'sl'
): { sl: string; en: string } {
  const isPt = lang === 'pt';

  // 1. Direct curated match
  if (isPt) {
    if (CURATED_PT_EXAMPLES[word.rank]) {
      return CURATED_PT_EXAMPLES[word.rank];
    }
  } else {
    if (CURATED_EXAMPLES[word.rank]) {
      return CURATED_EXAMPLES[word.rank];
    }
  }

  // 2. Search local cached & sample sentences using exact whole-word matching
  const sentencePool = isPt ? SAMPLE_SENTENCES_PT : [...loadSentenceCache(), ...SAMPLE_SENTENCES];
  const targetWord = word.sl.toLowerCase();
  const wordRegex = new RegExp(`(^|[\\s.,!?:;"'»«])${targetWord}([\\s.,!?:;"'»«]|$)`, 'i');
  
  const found = sentencePool.find(s =>
    s.targets.map(t => t.toLowerCase()).includes(targetWord) ||
    wordRegex.test(s.sl)
  );

  if (found) {
    return { sl: found.sl, en: found.en };
  }

  // 3. Fallback based on target language:
  const firstMeaning = word.en.split(';')[0].replace(/\([^)]*\)/g, '').trim().toLowerCase();

  if (isPt) {
    // European Portuguese fallbacks
    if (word.sl.endsWith('ar') || word.sl.endsWith('er') || word.sl.endsWith('ir')) {
      // Infinitive verb
      return {
        sl: `Eu quero ${word.sl} agora.`,
        en: `I want to ${firstMeaning} now.`,
      };
    }

    if (word.isGrammarWord) {
      return {
        sl: `Isto é muito importante para nós.`,
        en: `This is very important for us.`,
      };
    }

    // Concrete noun or adjective
    return {
      sl: `Onde está ${word.sl}?`,
      en: `Where is the ${firstMeaning}?`,
    };
  }

  // Slovenian fallbacks
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
