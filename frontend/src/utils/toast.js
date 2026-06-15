const getContainer = () => {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:99999;display:flex;flex-direction:column;gap:0.5rem;pointer-events:none';
    document.body.appendChild(c);
  }
  return c;
};

const show = (message, type = 'info') => {
  const c = getContainer();
  const el = document.createElement('div');
  Object.assign(el.style, {
    pointerEvents: 'auto',
    padding: '0.75rem 1.25rem',
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateX(120%)',
    transition: 'all 0.3s ease',
    maxWidth: '24rem',
    wordWrap: 'break-word',
    background: type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#2563eb',
    color: '#fff',
  });
  el.textContent = message;
  c.appendChild(el);
  requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    el.style.transform = 'translateX(120%)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3500);
};

const error = (msg) => show(msg, 'error');
const success = (msg) => show(msg, 'success');
const info = (msg) => show(msg, 'info');

export default { show, error, success, info };
