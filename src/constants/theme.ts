export const THEME_STORAGE_KEY = 'kanaku-admin-theme';
export type Theme = 'light' | 'dark';

/** Runs before first paint: applies the saved theme, else the OS preference (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;
