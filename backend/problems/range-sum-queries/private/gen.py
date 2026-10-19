import json, random
random.seed(7)
def case(a, qs): return f"{len(a)} {len(qs)}\n{' '.join(map(str, a))}\n" + ''.join(f"{l} {r}\n" for l, r in qs)
def rq(n, q):
    out = []
    for _ in range(q):
        l = random.randint(1, n); r = random.randint(l, n); out.append((l, r))
    return out
N = 100000
t = [case([7], [(1, 1)]), case([1, 2, 3], [(1, 3), (1, 1), (3, 3), (2, 3)]), case([-1, -2, -3, -4], [(1, 4), (2, 3)]),
     case([10**9] * 1000, [(1, 1000)] * 5), case([-10**9] * N, [(1, N)] * 10),
     case([random.randint(-100, 100) for _ in range(50)], rq(50, 50)),
     case([random.randint(-10**9, 10**9) for _ in range(N)], rq(N, N)),
     case([random.randint(-10**9, 10**9) for _ in range(N)], [(1, N)] * N)]
print(json.dumps(t))
