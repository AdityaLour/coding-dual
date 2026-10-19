import { createContext, useContext } from "react";

export const DuelContext = createContext(null);

export function useDuel() {
  const duel = useContext(DuelContext);
  if (!duel) throw new Error("useDuel must be used inside <DuelProvider>");
  return duel;
}
