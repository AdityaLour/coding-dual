#include <bits/stdc++.h>
using namespace std;
int main(){int n;scanf("%d",&n);long long mx=LLONG_MIN,mn=LLONG_MAX,x;while(n--){scanf("%lld",&x);mx=max(mx,x);mn=min(mn,x);}printf("%lld\n",mx-mn);}
