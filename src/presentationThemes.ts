export const presentationThemes = [
  { id: 'lagoon', name: 'Lagoon', titleBg: '#103c4d', contentBg: '#f3fbfa', accent: '#16b8a6', accent2: '#79e3d5', titleInk: '#ffffff', subtitleInk: '#c6f4ed', contentInk: '#173b46', bodyInk: '#365760' },
  { id: 'sunset', name: 'Sunset', titleBg: '#78344d', contentBg: '#fff8f0', accent: '#f17e5b', accent2: '#ffd18a', titleInk: '#ffffff', subtitleInk: '#ffe6d5', contentInk: '#5e3040', bodyInk: '#71505b' },
  { id: 'orchid', name: 'Orchid', titleBg: '#392a65', contentBg: '#f8f5ff', accent: '#9267eb', accent2: '#d9adfb', titleInk: '#ffffff', subtitleInk: '#e7d9ff', contentInk: '#3c315e', bodyInk: '#635b79' },
  { id: 'cobalt', name: 'Cobalt', titleBg: '#153568', contentBg: '#f3f8ff', accent: '#3881ef', accent2: '#7ed8f5', titleInk: '#ffffff', subtitleInk: '#d6ebff', contentInk: '#203e72', bodyInk: '#516783' },
  { id: 'citrus', name: 'Citrus', titleBg: '#305149', contentBg: '#fbfff2', accent: '#9ecf49', accent2: '#f4d768', titleInk: '#ffffff', subtitleInk: '#e8f8ce', contentInk: '#355346', bodyInk: '#597064' },
  { id: 'rose', name: 'Rose', titleBg: '#703650', contentBg: '#fff5f9', accent: '#df70a5', accent2: '#ffc0d8', titleInk: '#ffffff', subtitleInk: '#ffe0ec', contentInk: '#63354e', bodyInk: '#7a5769' },
  { id: 'plain', name: 'Plain', titleBg: '#ffffff', contentBg: '#ffffff', accent: '#587582', accent2: '#b9ccd2', titleInk: '#152d3c', subtitleInk: '#687c88', contentInk: '#152d3c', bodyInk: '#334c5b' },
] as const

export type PresentationThemeId = (typeof presentationThemes)[number]['id']
export const getPresentationTheme = (id?: string) => presentationThemes.find(theme => theme.id === id) || presentationThemes[presentationThemes.length - 1]
