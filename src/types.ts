export interface Option {
  id: string;
  text: string;
  value: string | number;
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'scale' | 'text';
  options?: Option[] | null;
  min?: number | null;
  max?: number | null;
  minLabel?: string | null;
  maxLabel?: string | null;
  order?: number;
}

export interface SurveyResponse {
  questionId: string;
  answer: string | string[] | number;
}

export interface FullSubmission {
  id?: number;
  created_at?: string;
  device_id: string;
  answers: SurveyResponse[];
}

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  UNSELECTED = 'unselected'
}