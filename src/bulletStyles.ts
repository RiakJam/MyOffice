export const bulletStyles = [
  { style: 'disc', symbol: '●', label: 'Filled circle' },
  { style: 'circle', symbol: '○', label: 'Open circle' },
  { style: 'square', symbol: '■', label: 'Square' },
  { style: 'dash', symbol: '–', label: 'Dash' },
  { style: 'diamond', symbol: '◆', label: 'Diamond' },
  { style: 'arrow', symbol: '➢', label: 'Arrow' },
  { style: 'check', symbol: '✓', label: 'Check mark' },
  { style: 'star', symbol: '★', label: 'Star' },
] as const

export function bulletSymbol(style: unknown): string {
  return bulletStyles.find(item => item.style === style)?.symbol ?? '●'
}
