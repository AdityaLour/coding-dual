import sys
d = list(map(int, sys.stdin.read().split()[1:]))
best = d[0]
for i in range(len(d)):
    s = 0
    for j in range(i, len(d)):
        s += d[j]
        if s > best:
            best = s
print(best)
