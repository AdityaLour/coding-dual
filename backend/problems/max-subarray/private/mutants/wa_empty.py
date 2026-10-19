import sys
d = list(map(int, sys.stdin.read().split()[1:]))
best = cur = 0
for x in d:
    cur = max(0, cur + x)
    best = max(best, cur)
print(best)
