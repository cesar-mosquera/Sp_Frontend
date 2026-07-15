// 16 colores (no 8) para que haga falta el doble de contactos distintos
// antes de que dos personas terminen compartiendo color -- el nombre y la
// inicial del avatar siguen siendo el diferenciador principal, el color es
// solo un apoyo visual para reconocer de un vistazo.
const AVATAR_COLORS = [
  '#00c463', '#18a0fb', '#ff5ed9', '#fe2c55',
  '#4285f4', '#ff9800', '#00ffb8', '#b300ff',
  '#ffd23f', '#ff6b6b', '#4ecdc4', '#a78bfa',
  '#f472b6', '#22d3ee', '#84cc16', '#fb923c',
];

// Color estable por contacto (mismo contacto = mismo color siempre), para
// poder distinguir de un vistazo quien es quien tanto en la lista de
// conversaciones como dentro de un chat individual.
export function colorForContact(contact: string): string {
  let hash = 0;
  for (let i = 0; i < contact.length; i++) hash = (hash * 31 + contact.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
