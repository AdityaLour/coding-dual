import json, random
random.seed(7)
def rnd(n, k): return ''.join(random.choice('abcdefghijklmnopqrstuvwxyz'[:k]) for _ in range(n))
t = ['a', 'aa', 'ab', 'aab', 'abb', 'aaabaaaa', 'abababab', 'a' * 100000, 'ab' * 50000,
     'b' * 30000 + 'a' * 69999 + 'c', 'c' + 'a' * 70000 + 'b' * 29999, rnd(100000, 2), rnd(100000, 26), rnd(500, 2)]
print(json.dumps([s + '\n' for s in t]))
