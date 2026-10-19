import sys
d = sys.stdin.read().split()
print(sum(map(int, d[1:1 + int(d[0])])))
