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

// The order a beginner meets them in. Chips follow it; a topic not listed goes last.
const LEARNING_ORDER = [
  "arrays-hashing",
  "strings",
  "two-pointers-window",
  "linked-lists",
  "stack-queue",
  "binary-search",
  "sorting-greedy",
  "bits-math",
  "trees",
  "heaps",
  "backtracking",
  "graphs",
  "dynamic-programming",
];

export function compareTopics(a, b) {
  const rank = (slug) => {
    const i = LEARNING_ORDER.indexOf(slug);
    return i === -1 ? LEARNING_ORDER.length : i;
  };
  return rank(a) - rank(b) || topicName(a).localeCompare(topicName(b));
}

// A topic added on the server before this list learns it still reads fine.
export function topicName(slug) {
  if (NAMES[slug]) return NAMES[slug];
  const words = String(slug ?? "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
