import sys
d = sys.stdin.read().split()
print(sum(abs(int(x)) for x in d[1:]))
