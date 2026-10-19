import json, random
random.seed(7)
def rnd(n, k): return ''.join(random.choice('abcdefghijklmnopqrstuvwxyz'[:k]) for _ in range(n))
half = rnd(50000, 3)
big = half + half[::-1]
bigodd = half + 'z' + half[::-1]
bad = list(big); bad[-1] = 'q' if big[-1] != 'q' else 'r'
mid = list(bigodd); mid[40000] = 'y'
t = ['a', 'ab', 'aa', 'aba', 'abba', 'abcba', 'abcda', 'racecar', 'abcdba', big, bigodd, ''.join(bad), ''.join(mid), rnd(100000, 2)]
print(json.dumps([s + '\n' for s in t]))
