import json, random
random.seed(7)
def fmt(a): return f"{len(a)}\n{' '.join(map(str, a))}\n"
t = [fmt([42]), fmt([5, 5, 5]), fmt([-10**9, 10**9]), fmt([10**9, -10**9]), fmt([3, 1, 2]), fmt([-5, -9, -1])]
for n, lo, hi in [(20, -50, 50), (1000, -10**9, 10**9), (100000, -10**9, 10**9)]:
    t.append(fmt([random.randint(lo, hi) for _ in range(n)]))
print(json.dumps(t))
