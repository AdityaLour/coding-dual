import sys
d = sorted(map(int, sys.stdin.read().split()[1:]))
print(d[-2] if len(d) > 1 else 'NONE')
