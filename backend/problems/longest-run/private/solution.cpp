#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;int b=1,c=1;for(size_t i=1;i<s.size();i++){c=s[i]==s[i-1]?c+1:1;b=max(b,c);}printf("%d\n",b);}
