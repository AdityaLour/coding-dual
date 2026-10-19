s = input().strip()
h = len(s) // 2
print('YES' if s[:h] == s[h:][::-1] else 'NO')
