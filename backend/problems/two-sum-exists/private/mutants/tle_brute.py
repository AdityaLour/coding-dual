import sys
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
for i in range(n):
    for j in range(i + 1, n):
        if a[i] + a[j] == k:
            print('YES')
            raise SystemExit
print('NO')
