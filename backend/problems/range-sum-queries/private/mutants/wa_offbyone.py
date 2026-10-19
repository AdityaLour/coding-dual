import sys
d = sys.stdin.read().split()
n, q = int(d[0]), int(d[1])
p = [0]
for x in d[2:2 + n]:
    p.append(p[-1] + int(x))
print('\n'.join(str(p[int(d[3 + n + 2 * i])] - p[int(d[2 + n + 2 * i])]) for i in range(q)))
