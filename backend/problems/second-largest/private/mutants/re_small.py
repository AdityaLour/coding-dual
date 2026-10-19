import sys
d = sorted(set(map(int, sys.stdin.read().split()[1:])))
print(d[-2])
