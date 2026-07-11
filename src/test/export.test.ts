import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadCSV } from '../utils/export';

describe('downloadCSV', () => {
  let capturedBlobText: string | null = null;

  beforeEach(() => {
    capturedBlobText = null;
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        blob.text().then(t => { capturedBlobText = t; });
        return 'blob:mock-url';
      }),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function getCsvText(): Promise<string> {
    // El Blob.text() usado en createObjectURL es async; esperamos un tick.
    await new Promise(resolve => setTimeout(resolve, 0));
    return capturedBlobText ?? '';
  }

  it('regresion: neutraliza CSV/Formula Injection cuando un contacto escribe algo que empieza con = + - @', async () => {
    downloadCSV(
      ['contacto', 'mensaje'],
      [
        ['Contacto Malicioso', '=cmd|\'/c calc\'!A1'],
        ['Otro', '+HYPERLINK("http://evil.com","click")'],
        ['Otro2', '-1+2'],
        ['Otro3', '@SUM(1,2)'],
        ['Normal', 'hola, todo bien'],
      ],
      'test.csv'
    );

    const csv = await getCsvText();
    // Cada celda peligrosa debe quedar neutralizada con un apostrofe adelante,
    // para que Excel/Sheets no la interprete como formula al abrir el archivo.
    expect(csv).toContain("\"'=cmd|'/c calc'!A1\"");
    expect(csv).toContain('"\'+HYPERLINK(""http://evil.com"",""click"")"');
    expect(csv).toContain('"\'-1+2"');
    expect(csv).toContain('"\'@SUM(1,2)"');
    // El contenido normal no debe llevar el apostrofe agregado.
    expect(csv).toContain('"hola, todo bien"');
  });

  it('genera el CSV normal con headers y filas cuando no hay contenido peligroso', async () => {
    downloadCSV(['a', 'b'], [['1', '2']], 'test.csv');
    const csv = await getCsvText();
    expect(csv).toBe('a,b\n"1","2"');
  });
});
