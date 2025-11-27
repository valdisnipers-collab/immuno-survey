import { Question } from '../types';

// Default questions based on the "7. pielikums" theme
export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'demo_class',
    text: 'Kurā klasē Tu mācies?',
    type: 'single',
    options: [
      { id: '10', text: '10. klase', value: '10' },
      { id: '11', text: '11. klase', value: '11' },
      { id: '12', text: '12. klase', value: '12' },
    ],
  },
  {
    id: 'demo_gender',
    text: 'Tavs dzimums:',
    type: 'single',
    options: [
      { id: 'm', text: 'Vīrietis', value: 'male' },
      { id: 'f', text: 'Sieviete', value: 'female' },
    ],
  },
  {
    id: 'food_veg',
    text: 'Cik bieži Tu uzturā lieto svaigus dārzeņus un augļus?',
    type: 'single',
    options: [
      { id: 'opt1', text: 'Katru dienu', value: 'daily' },
      { id: 'opt2', text: '3-4 reizes nedēļā', value: '3-4_week' },
      { id: 'opt3', text: 'Retāk kā reizi nedēļā', value: 'rarely' },
      { id: 'opt4', text: 'Gandrīz nekad', value: 'never' },
    ],
  },
  {
    id: 'food_junk',
    text: 'Cik bieži lieto "Fast Food" vai neveselīgas uzkodas (čipsi, saldumi)?',
    type: 'single',
    options: [
      { id: 'opt1', text: 'Katru dienu', value: 'daily' },
      { id: 'opt2', text: 'Dažas reizes nedēļā', value: 'few_times_week' },
      { id: 'opt3', text: 'Reti (reizi mēnesī)', value: 'rarely' },
      { id: 'opt4', text: 'Nelietoju', value: 'never' },
    ],
  },
  {
    id: 'food_water',
    text: 'Cik daudz ūdens Tu izdzer dienā?',
    type: 'single',
    options: [
      { id: 'w1', text: 'Mazāk par 1 litru', value: '<1l' },
      { id: 'w2', text: '1 - 2 litri', value: '1-2l' },
      { id: 'w3', text: 'Vairāk par 2 litriem', value: '>2l' },
    ],
  },
  {
    id: 'phys_movement',
    text: 'Cik daudz laika dienā pavadi kustībā (staigāšana, aktīva atpūta)?',
    type: 'single',
    options: [
      { id: 'm1', text: 'Mazāk par 30 min', value: '<30min' },
      { id: 'm2', text: '30 min - 1 stunda', value: '30-60min' },
      { id: 'm3', text: 'Vairāk par 1 stundu', value: '>60min' },
    ],
  },
  {
    id: 'phys_sport',
    text: 'Cik bieži nodarbojies ar sportu ārpus skolas?',
    type: 'single',
    options: [
      { id: 's1', text: 'Nenodarbojos', value: 'none' },
      { id: 's2', text: '1-2 reizes nedēļā', value: '1-2_week' },
      { id: 's3', text: '3 vai vairāk reizes nedēļā', value: '3+_week' },
    ],
  },
  {
    id: 'health_sleep',
    text: 'Cik stundas diennaktī Tu parasti guli?',
    type: 'single',
    options: [
      { id: 'under6', text: 'Mazāk par 6 stundām', value: '<6h' },
      { id: '6to8', text: '6 - 8 stundas', value: '6-8h' },
      { id: 'over8', text: 'Vairāk par 8 stundām', value: '>8h' },
    ],
  },
  {
    id: 'health_illness',
    text: 'Cik bieži pēdējā gada laikā esi slimojis (vīrusi, saaukstēšanās)?',
    type: 'single',
    options: [
      { id: 'i1', text: 'Neslimoju ne reizi', value: '0' },
      { id: 'i2', text: '1-2 reizes', value: '1-2' },
      { id: 'i3', text: '3-5 reizes', value: '3-5' },
      { id: 'i4', text: 'Biežāk par 5 reizēm', value: '>5' },
    ],
  },
  {
    id: 'health_self_eval',
    text: 'Novērtē savu vispārējo veselības stāvokli:',
    type: 'scale',
    min: 1,
    max: 10,
    minLabel: 'Vāja imunitāte',
    maxLabel: 'Lieliska veselība',
  },
  {
    id: 'health_vitamins',
    text: 'Vai lieto papildus vitamīnus (D vitamīns, C vitamīns u.c.)?',
    type: 'single',
    options: [
      { id: 'y', text: 'Jā, regulāri', value: 'yes_regular' },
      { id: 's', text: 'Dažreiz / Kampaņveidīgi', value: 'sometimes' },
      { id: 'n', text: 'Nē, nelietoju', value: 'no' },
    ],
  },
  {
    id: 'health_fatigue',
    text: 'Cik bieži jūti nogurumu mācību procesā?',
    type: 'scale',
    min: 1,
    max: 5,
    minLabel: 'Nekad',
    maxLabel: 'Pastāvīgi',
  },
  {
    id: 'open_feedback',
    text: 'Tavs ieteikums: Ko varētu darīt, lai uzlabotu skolēnu imunitāti?',
    type: 'text',
  }
];

export const generateFingerprint = (): string => {
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const raw = ua + screen;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};