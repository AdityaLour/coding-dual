// How a topic is named on screen. The server sends the folder name ("two-pointers-window").
const NAMES = {
  "arrays-hashing": "Arrays & hashing",
  backtracking: "Backtracking",
  "binary-search": "Binary search",
  "bits-math": "Bits & math",
  "dynamic-programming": "Dynamic programming",
  graphs: "Graphs",
  heaps: "Heaps",
  "linked-lists": "Linked lists",
  "sorting-greedy": "Sorting & greedy",
  "stack-queue": "Stacks & queues",
  strings: "Strings",
  trees: "Trees",
  "two-pointers-window": "Two pointers & windows",
};

// A topic added on the server before this list learns it still reads fine.
export function topicName(slug) {
  if (NAMES[slug]) return NAMES[slug];
  const words = String(slug ?? "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
