function escapeCsv(str: unknown): string {
  let value = (str ?? '').toString();
  // Los datos exportados vienen de mensajes de contactos, no del propio
  // usuario. Si un contacto escribe algo que empieza con =, +, -, @ (o tab/CR),
  // Excel/Sheets puede interpretarlo como formula al abrir el CSV (CSV/Formula
  // Injection). Se antepone un apostrofe para forzarlo a texto plano.
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

export function downloadCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
