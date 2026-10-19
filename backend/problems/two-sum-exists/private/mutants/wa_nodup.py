import sys
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
s = set(map(int, d[2:2 + n]))
print('YES' if any(k - x in s and k - x != x for x in s) else 'NO')
