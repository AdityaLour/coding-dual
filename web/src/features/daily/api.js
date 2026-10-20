import { api } from "@/shared/api/client.js";

// Today's problem, this player's streak, this week's squares, and the moment the day ends.
export const getDaily = () => api("/api/daily");
