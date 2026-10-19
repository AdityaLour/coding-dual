import json, random
random.seed(7)
def fmt(a): return f"{len(a)}\n{' '.join(map(str, a))}\n"
t = [fmt([1]), fmt([1, 2]), fmt([2, 1]), fmt([-1, -2]), fmt([-5, -5]), fmt([9, 9, 8]), fmt([0, 0, -3]),
     fmt([-7, -3, -9, -3]), fmt([10**9, -10**9]), fmt([4] * 100000)]
for n, lo, hi in [(30, -20, 20), (1000, -10**9, 10**9), (100000, -10**9, 10**9), (100000, 0, 3)]:
    t.append(fmt([random.randint(lo, hi) for _ in range(n)]))
print(json.dumps(t))
