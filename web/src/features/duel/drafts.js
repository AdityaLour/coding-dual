// Small per-tab conveniences kept in the browser: the code typed so far (so a reload mid-duel does not lose
// it) and the language last used. Storage can be missing or blocked, so every access is guarded.
import { DEFAULT_LANGUAGE, LANGUAGES } from "./languages.js";

const DRAFT = "boip:draft:";
const LANGUAGE = "boip:language";

const guard = (run, fallback) => {
  try {
    return run();
  } catch {
    return fallback;
  }
};

export const readDraft = (duelId, languageId) =>
  guard(() => sessionStorage.getItem(`${DRAFT}${duelId}:${languageId}`), null);
export const writeDraft = (duelId, languageId, source) =>
  guard(() =>
    sessionStorage.setItem(`${DRAFT}${duelId}:${languageId}`, source),
  );

export function clearDrafts(duelId) {
  if (!duelId) return;
  guard(() => {
    for (const { id } of LANGUAGES)
      sessionStorage.removeItem(`${DRAFT}${duelId}:${id}`);
  });
}

export function readLanguage() {
  const id = Number(guard(() => localStorage.getItem(LANGUAGE), null));
  return LANGUAGES.some((language) => language.id === id)
    ? id
    : DEFAULT_LANGUAGE;
}
export const writeLanguage = (id) =>
  guard(() => localStorage.setItem(LANGUAGE, String(id)));
