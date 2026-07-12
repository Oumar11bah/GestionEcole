export const buildSchoolHeaderHTML = (s) => {
  if (!s) return '';
  const logo = s.logo
    ? `<img src="${s.logo}" alt="Logo" style="height:60px;object-fit:contain" />`
    : '';
  const sig = s.director_signature
    ? `<img src="${s.director_signature}" alt="Signature" style="height:40px;object-fit:contain" />`
    : '';
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${s.primary_color || '#1e3a5f'};padding-bottom:12px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px">
        ${logo}
        <div>
          <div style="font-size:20px;font-weight:bold;color:${s.primary_color || '#1e3a5f'};text-transform:uppercase;letter-spacing:1px">${s.name || ''}</div>
          ${s.acronym ? `<div style="font-size:12px;color:#666;margin-top:2px">${s.acronym}</div>` : ''}
          ${s.address ? `<div style="font-size:11px;color:#888">${s.address}${s.city ? ', ' + s.city : ''}${s.country ? ', ' + s.country : ''}</div>` : ''}
          ${s.phone ? `<div style="font-size:11px;color:#888">${s.phone}</div>` : ''}
        </div>
      </div>
      <div style="text-align:right">
        ${s.director_name ? `<div style="font-size:11px;color:#666">Directeur(trice)</div><div style="font-size:12px;font-weight:600;color:#333">${s.director_name}</div>` : ''}
        ${sig}
      </div>
    </div>
  `;
};

export const buildSchoolHeaderStyles = (s) => `
  @page { margin: 15mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; }
  th { background: ${s?.primary_color || '#1e3a5f'}; color: #fff; font-size: 10px; }
  td { font-size: 10px; }
  tr:nth-child(even) { background: #f8fafc; }
  h2 { text-align: center; color: ${s?.primary_color || '#1e3a5f'}; margin: 5px 0; }
  .info { text-align: center; color: #666; font-size: 12px; margin-bottom: 15px; }
  .footer { text-align: center; color: #999; font-size: 10px; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
`;
