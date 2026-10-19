#include <bits/stdc++.h>
using namespace std;
int main(){int n;scanf("%d",&n);long long b=LLONG_MIN,c=0,x;while(n--){scanf("%lld",&x);c=max(x,c+x);b=max(b,c);}printf("%lld\n",b);}
