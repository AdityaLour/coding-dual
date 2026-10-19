// The languages a duel accepts: Judge0 id, name, which syntax highlighter to load, and a starting file
// that reads the input from stdin (the same input the hidden tests use).
export const LANGUAGES = [
  {
    id: 71,
    name: "Python 3",
    syntax: "python",
    starter: `import sys


def main():
    data = sys.stdin.read().split()
    # your code here


main()
`,
  },
  {
    id: 54,
    name: "C++",
    syntax: "cpp",
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // your code here
    return 0;
}
`,
  },
  {
    id: 62,
    name: "Java",
    syntax: "java",
    starter: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        // your code here
    }
}
`,
  },
  {
    id: 63,
    name: "JavaScript",
    syntax: "javascript",
    starter: `const data = require("fs").readFileSync(0, "utf8").split(/\\s+/).filter(Boolean);
// your code here
`,
  },
  {
    id: 50,
    name: "C",
    syntax: "cpp",
    starter: `#include <stdio.h>

int main(void) {
    // your code here
    return 0;
}
`,
  },
];

export const DEFAULT_LANGUAGE = 71;
export const languageById = (id) =>
  LANGUAGES.find((language) => language.id === id) ?? LANGUAGES[0];
