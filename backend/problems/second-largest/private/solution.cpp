#include <bits/stdc++.h>
using namespace std;
int main(){int n;scanf("%d",&n);set<long long> s;long long x;while(n--){scanf("%lld",&x);s.insert(x);}if(s.size()<2)puts("NONE");else printf("%lld\n",*next(s.rbegin()));}
