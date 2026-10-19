import sys
d = list(map(int, sys.stdin.read().split()))[1:]
mx = mn = 0
for x in d:
    mx = max(mx, x)
    mn = min(mn, x)
print(mx - mn)
