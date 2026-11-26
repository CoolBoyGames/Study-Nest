export interface GradientPreset {
  id: string;
  label: string;
  css: string;
  preview: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'morning-mist',
    label: 'Morning Mist',
    css: 'radial-gradient(circle at 20% 20%, #d8e7fa 0%, #eaf2fb 45%, #dde8f6 100%)',
    preview: 'linear-gradient(135deg, #d8e7fa, #dde8f6)',
  },
  {
    id: 'alpine-sage',
    label: 'Alpine Sage',
    css: 'radial-gradient(circle at 75% 25%, #dcebe2 0%, #ebf3ee 50%, #d8e7de 100%)',
    preview: 'linear-gradient(135deg, #dcebe2, #d8e7de)',
  },
  {
    id: 'library-linen',
    label: 'Library Linen',
    css: 'radial-gradient(circle at 30% 30%, #f7f3ea 0%, #ede7da 55%, #e4ddd0 100%)',
    preview: 'linear-gradient(135deg, #f7f3ea, #e4ddd0)',
  },
  {
    id: 'twilight-wash',
    label: 'Twilight Wash',
    css: 'radial-gradient(circle at 25% 20%, #393f63 0%, #2a2d43 55%, #1e2133 100%)',
    preview: 'linear-gradient(135deg, #393f63, #1e2133)',
  },
  {
    id: 'midnight-harbor',
    label: 'Midnight Harbor',
    css: 'radial-gradient(circle at 70% 15%, #1b2a47 0%, #0f1626 60%, #0a0f1c 100%)',
    preview: 'linear-gradient(135deg, #1b2a47, #0a0f1c)',
  },
  {
    id: 'fjord-horizon',
    label: 'Fjord Horizon',
    css: 'linear-gradient(145deg, #cfe0f5 0%, #e4edf8 48%, #d4e3e0 100%)',
    preview: 'linear-gradient(145deg, #cfe0f5, #d4e3e0)',
  },
];
