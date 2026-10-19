import sys
d = list(map(int, sys.stdin.read().split()))[1:]
print(max(d) - min(d))
