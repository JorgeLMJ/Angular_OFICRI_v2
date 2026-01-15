// Este archivo define la estructura de los datos para Toxicología

export interface ToxicologiaResultado {
  marihuana?: 'Positivo' | 'Negativo';
  cocaina?: 'Positivo' | 'Negativo';
  benzodiacepinas?: 'Positivo' | 'Negativo';
  barbituricos?: 'Positivo' | 'Negativo';
  carbamatos?: 'Positivo' | 'Negativo';
  estricnina?: 'Positivo' | 'Negativo';
  cumarinas?: 'Positivo' | 'Negativo';
  organofosforados?: 'Positivo' | 'Negativo';
  misoprostol?: 'Positivo' | 'Negativo';
  piretrinas?: 'Positivo' | 'Negativo';
}

export interface AsignacionToxicologia {
  id?: number;
  area: string;
  estado: string;
  documentoId: number;
  empleadoId: number;
  resultados: ToxicologiaResultado;
}
