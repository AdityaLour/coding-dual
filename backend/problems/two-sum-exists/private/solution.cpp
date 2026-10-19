#include <bits/stdc++.h>
using namespace std;
int main(){int n;long long k,x;scanf("%d %lld",&n,&k);unordered_set<long long> s;s.reserve(n*2);bool f=false;while(n--){scanf("%lld",&x);if(s.count(k-x))f=true;s.insert(x);}puts(f?"YES":"NO");}
