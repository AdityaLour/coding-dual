import sys
d = sys.stdin.read().split()
n, k = int(d[0]), int(d[1])
seen = set()
for x in map(int, d[2:2 + n]):
    if k - x in seen:
        print('YES')
        break
    seen.add(x)
else:
    print('NO')
