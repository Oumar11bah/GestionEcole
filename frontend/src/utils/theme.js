import { schoolService } from '../services/api';

export const applyThemeColors = (primary, secondary) => {
  const root = document.documentElement;
  root.style.setProperty('--primary', primary || '#1e40af');
  root.style.setProperty('--primary-hover', darkenColor(primary || '#1e40af', 20));
  root.style.setProperty('--primary-light', lightenColor(primary || '#1e40af', 80));
  root.style.setProperty('--primary-ring', secondary || '#3b82f6');
  root.style.setProperty('--secondary', secondary || '#3b82f6');
  root.style.setProperty('--sidebar-from', primary ? adjustColor(primary, -30) : '#1e3a5f');
  root.style.setProperty('--sidebar-to', primary ? adjustColor(primary, -60) : '#0f1b2d');
};

export const loadSchoolTheme = async () => {
  try {
    const res = await schoolService.get();
    if (res.data) {
      applyThemeColors(res.data.primary_color, res.data.secondary_color);
    }
  } catch {}
};

function darkenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * percent / 100));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(((num >> 8) & 0x00FF) * percent / 100));
  const b = Math.max(0, (num & 0x0000FF) - Math.round((num & 0x0000FF) * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent / 100));
  const b = Math.min(255, (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((num >> 16) * percent / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + Math.round(((num >> 8) & 0x00FF) * percent / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + Math.round((num & 0x0000FF) * percent / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
