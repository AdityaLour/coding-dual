import { api } from "@/shared/api/client.js";

// Both boards, your own standing, and the week's start and end, in one answer.
export const getBoard = () => api("/api/leaderboard");
// Just your all-time rank (or null), for the small badge in the header.
export const getRank = () => api("/api/leaderboard/rank");
