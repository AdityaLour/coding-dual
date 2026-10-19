import itertools
print(max(len(list(g)) for _, g in itertools.groupby(input().strip())))
