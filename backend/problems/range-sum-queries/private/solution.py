import sys
d = sys.stdin.read().split()
n, q = int(d[0]), int(d[1])
p = [0]
for x in d[2:2 + n]:
    p.append(p[-1] + int(x))
out = []
for i in range(q):
    l, r = int(d[2 + n + 2 * i]), int(d[3 + n + 2 * i])
    out.append(p[r] - p[l - 1])
print('\n'.join(map(str, out)))
