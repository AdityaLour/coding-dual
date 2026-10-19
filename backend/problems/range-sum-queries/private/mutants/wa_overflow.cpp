#include <bits/stdc++.h>
using namespace std;
int main(){int n,q;scanf("%d %d",&n,&q);vector<int> p(n+1);for(int i=1;i<=n;i++){int x;scanf("%d",&x);p[i]=p[i-1]+x;}while(q--){int l,r;scanf("%d %d",&l,&r);printf("%d\n",p[r]-p[l-1]);}}
