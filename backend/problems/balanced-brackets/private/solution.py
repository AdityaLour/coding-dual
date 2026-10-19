s = input().strip()
m = {')': '(', ']': '[', '}': '{'}
st = []
ok = True
for c in s:
    if c in '([{':
        st.append(c)
    elif not st or st.pop() != m[c]:
        ok = False
        break
print('YES' if ok and not st else 'NO')
