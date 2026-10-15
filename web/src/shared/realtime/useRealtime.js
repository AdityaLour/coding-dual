import { createContext, useContext } from "react";

export const RealtimeContext = createContext(null);

export function useRealtime() {
  const realtime = useContext(RealtimeContext);
  if (!realtime) {
    throw new Error("useRealtime must be used inside <RealtimeProvider>");
  }
  return realtime;
}
