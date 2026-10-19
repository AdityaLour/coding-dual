#include <bits/stdc++.h>
using namespace std;
int main(){int n;scanf("%d",&n);int b=INT_MIN,c=0,x;while(n--){scanf("%d",&x);c=max(x,c+x);b=max(b,c);}printf("%d\n",b);}
