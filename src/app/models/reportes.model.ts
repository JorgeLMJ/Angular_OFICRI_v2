export interface GraficoRangoCualitativo {
  rango: string;
  cantidad: number;
}
export interface GraficoSustancia {
  sustancia: string;
  totalAnalisis: number;
}

export interface GraficoEstado {
  estado: string;
  cantidad: number;
}

export interface GraficoTiempo {
  tipoAnalisis: string;
  tiempoPromedioHoras: number;
}

export interface GraficoEmpleado {
  empleado: string;
  apellido: string;
  totalAnalisis: number;
}

export interface DocumentoPorDia {
  fecha: string;
  total: number;
}

export interface Metrica {
  totalEmpleados: number;
  totalDocumentos: number;
}