import sys
d = sys.stdin.read().split()
n, q = int(d[0]), int(d[1])
a = list(map(int, d[2:2 + n]))
for i in range(q):
    l, r = int(d[2 + n + 2 * i]), int(d[3 + n + 2 * i])
    s = 0
    for j in range(l - 1, r):
        s += a[j]
    print(s)
