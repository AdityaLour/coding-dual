import sys
d = list(map(int, sys.stdin.read().split()[1:]))
best = cur = d[0]
for x in d[1:]:
    cur = max(x, cur + x)
    best = max(best, cur)
print(best)
