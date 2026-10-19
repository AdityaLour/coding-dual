import sys
d = list(map(int, sys.stdin.read().split()[1:]))
m1 = m2 = 0
for x in d:
    if x > m1:
        m1, m2 = x, m1
    elif m1 > x > m2:
        m2 = x
print(m2 if m2 else 'NONE')
