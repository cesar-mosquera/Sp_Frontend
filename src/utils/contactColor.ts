const AVATAR_COLORS = ['#00c463', '#18a0fb', '#ff5ed9', '#fe2c55', '#4285f4', '#ff9800', '#00ffb8', '#b300ff'];

// Color estable por contacto (mismo contacto = mismo color siempre), para
// poder distinguir de un vistazo quien es quien tanto en la lista de
// conversaciones como dentro de un chat individual.
export function colorForContact(contact: string): string {
  let hash = 0;
  for (let i = 0; i < contact.length; i++) hash = (hash * 31 + contact.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
