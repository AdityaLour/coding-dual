s = input().strip()
m = {')': '(', ']': '[', '}': '{'}
st = []
for c in s:
    if c in '([{':
        st.append(c)
    elif st and st.pop() != m[c]:
        print('NO')
        raise SystemExit
print('YES')
