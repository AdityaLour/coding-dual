import json, random
random.seed(7)
def fmt(a): return f"{len(a)}\n{' '.join(map(str, a))}\n"
N = 100000
t = [fmt([5]), fmt([-5]), fmt([-3, -1, -2]), fmt([1, 2, 3]), fmt([5, -10, 5]), fmt([5, -3, 5]), fmt([-1, 10**9, -1, 10**9, -1]),
     fmt([10**9] * N), fmt([-10**9] * N), fmt([(-1) ** i * 10**9 for i in range(N)])]
for n, lo, hi in [(30, -20, 20), (1000, -10**9, 10**9), (N, -10**9, 10**9), (N, -10**9, 10**8), (N, -10**8, 10**9)]:
    t.append(fmt([random.randint(lo, hi) for _ in range(n)]))
print(json.dumps(t))
