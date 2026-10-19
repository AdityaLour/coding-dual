import sys
d = sys.stdin.read().split()
n = int(d[0])
print(sum(int(d[i]) for i in range(1, n + 2)))
