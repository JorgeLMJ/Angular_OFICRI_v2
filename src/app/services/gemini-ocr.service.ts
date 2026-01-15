import { Injectable } from '@angular/core';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export interface OCRResult {
  nro_oficio: string;
  nombre_oficio: string;
  asunto: string;
  nombres: string;
  apellidos: string;
  edad: string;
  dni_ce: string;
  situacion: string;
  delito_infraccion: string;
  hora_incidente: string;
  fecha_incidente: string;
  procedencia: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiOcrService {
  private apiKey = 'AIzaSyD-r8zieUpSy5piNiAVi2aS0NP8t29uQzw';
  private genAI = new GoogleGenerativeAI(this.apiKey);
  private model = this.genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ]
  });

  async extractTextFromFiles(files: File[]): Promise<string> {
    const prompt = "Extrae TODO el texto visible. Incluye números, sellos, encabezados, pies de página. Devuelve solo el texto.";
    const fileParts = await Promise.all(files.map(file => this.fileToGenerativePart(file)));
    const result = await this.model.generateContent([prompt, ...fileParts]);
    return result.response.text().trim();
  }

  async extractStructuredData(text: string): Promise<OCRResult> {
    const prompt = `
Eres un asistente experto en procesar oficios policiales peruanos. Extrae EXACTAMENTE los siguientes campos del texto proporcionado.
Si un campo no está presente, escribe "No encontrado".

Formato de salida: JSON válido, sin comentarios, sin markdown.

Campos:
- "nro_oficio": solo el número que sigue a "Oficio N°" o "N°", sin texto adicional.
- "nombre_oficio": la línea completa donde aparece el número de oficio.
- "asunto": todo el texto que sigue a "Asunto:" o "ASUNTO:", hasta el siguiente encabezado o salto lógico.
- "nombres": nombre(s) de la persona (solo nombres, sin apellidos).
- "apellidos": apellido(s) completos.
- "edad": número de edad (generalmente entre paréntesis tras el nombre).
- "dni_ce": número de DNI o Carné de Extranjería (8 dígitos o con letra).
- "situacion": descripción breve de la situación reportada.
- "delito_infraccion": tipo de delito o infracción mencionado.
- "hora_incidente": hora en formato HH:MM (ej: 02:00).
- "fecha_incidente": fecha en formato DDMMMYYYY o similar (ej: 19SET2025).
- "procedencia": texto del sello oficial, desde la cuarta línea en adelante (incluye cuarta, quinta, etc.).

Texto a analizar:
\"\"\"
${text}
\"\"\"
`;
    const result = await this.model.generateContent(prompt);
    let raw = result.response.text().trim();
    if (raw.startsWith("```json")) raw = raw.slice(7);
    if (raw.endsWith("```")) raw = raw.slice(0, -3);
    try {
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error('Error al parsear JSON: ' + error.message);
      } else {
        throw new Error('Error al parsear JSON: respuesta inválida de Gemini');
      }
    }
  }

  private async fileToGenerativePart(file: File): Promise<any> {
    const base64 = await this.toBase64(file);
    return {
      inlineData: {
        data: base64.split(',')[1],
        mimeType: file.type
      }
    };
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  }
}