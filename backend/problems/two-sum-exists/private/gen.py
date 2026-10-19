import json, random
random.seed(7)
def fmt(k, a): return f"{len(a)} {k}\n{' '.join(map(str, a))}\n"
N = 200000
big = random.sample(range(1, 10**9), N)
yes = big[:]; yes[7], yes[N - 3] = 123456789, 876543211
no_ = [x for x in range(1, N + 1)]
t = [fmt(10, [5]), fmt(10, [5, 5]), fmt(10, [5, 1, 2]), fmt(0, [3, -3]), fmt(0, [0]), fmt(0, [0, 0]), fmt(-4, [-1, -3, 8]),
     fmt(2 * 10**9, [10**9, 10**9]), fmt(-2 * 10**9, [-10**9, 5, -10**9]), fmt(7, [1, 2, 3, 4]), fmt(8, [4, 1, 2, 3]),
     fmt(10**9, big), fmt(10**9, yes), fmt(2 * N + 5, no_), fmt(N + 1, no_)]
print(json.dumps(t))
