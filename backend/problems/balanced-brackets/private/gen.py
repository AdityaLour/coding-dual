import json, random
random.seed(7)
PAIRS = {'(': ')', '[': ']', '{': '}'}
def balanced(n):
    out, stack = [], []
    for i in range(n):
        left = n - i
        if stack and (len(stack) >= left or random.random() < 0.5):
            out.append(PAIRS[stack.pop()])
        else:
            o = random.choice('([{'); stack.append(o); out.append(o)
    return ''.join(out)
deep = '(' * 50000 + ')' * 50000
t = ['()', '(', ')', ')(', '[]{}()', '(]', '((', '))', '{[()]}', '{[(])}', '([)]', '(()', '())', deep, deep[:-1] + ']',
     '(' * 49999 + '[' + ')' * 49999 + ']', balanced(100000), balanced(2000), balanced(99998) + '(', ')' + balanced(99998) + '(']
print(json.dumps([s + '\n' for s in t]))
