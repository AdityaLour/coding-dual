#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;scanf("%d %d",&n,&q);vector<long long> p(n+1);for(int i=1;i<=n;i++){long long x;scanf("%lld",&x);p[i]=p[i-1]+x;}while(q--){int l,r;scanf("%d %d",&l,&r);printf("%lld\n",p[r]-p[l-1]);}}
