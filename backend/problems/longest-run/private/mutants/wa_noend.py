s = input().strip()
best = cur = 1
for i in range(1, len(s)):
    if s[i] == s[i - 1]:
        cur += 1
    else:
        best = max(best, cur)
        cur = 1
print(best)
