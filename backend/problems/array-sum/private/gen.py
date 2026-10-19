import json, random
random.seed(7)
def fmt(a): return f"{len(a)}\n{' '.join(map(str, a))}\n"
t = [fmt([5]), fmt([-7, 3, -2]), fmt([-10**9] * 1000), fmt([10**9] * 100000)]
for n, lo, hi in [(10, -100, 100), (1000, -10**9, 10**9), (100000, -10**9, 10**9)]:
    t.append(fmt([random.randint(lo, hi) for _ in range(n)]))
print(json.dumps(t))
