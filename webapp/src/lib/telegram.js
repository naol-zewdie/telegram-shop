export const tg = window.Telegram.WebApp;

function applyTheme() {
  const params = tg.themeParams;
  const root = document.documentElement;

  root.style.setProperty('--tg-theme-bg-color', params.bg_color || '#ffffff');
  root.style.setProperty('--tg-theme-text-color', params.text_color || '#000000');
  root.style.setProperty('--tg-theme-hint-color', params.hint_color || '#999999');
  root.style.setProperty('--tg-theme-link-color', params.link_color || '#2481cc');
  root.style.setProperty('--tg-theme-button-color', params.button_color || '#2481cc');
  root.style.setProperty('--tg-theme-button-text-color', params.button_text_color || '#ffffff');
  root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color || '#f0f0f0');
}

export function initTelegramApp() {
  tg.ready();
  tg.expand();
  applyTheme();
  tg.onEvent('themeChanged', applyTheme);
}

export function getInitData() {
  return tg.initData;
}

export function getUser() {
  return tg.initDataUnsafe.user;
}
