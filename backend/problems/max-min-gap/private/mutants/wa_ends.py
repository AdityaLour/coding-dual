import sys
d = list(map(int, sys.stdin.read().split()))[1:]
print(abs(d[-1] - d[0]))
