#include <bits/stdc++.h>
using namespace std;
int main(){string s;cin>>s;string st;bool ok=true;for(char c:s){if(c=='('||c=='['||c=='{')st+=c;else{char o=c==')'?'(':c==']'?'[':'{';if(st.empty()||st.back()!=o){ok=false;break;}st.pop_back();}}puts(ok&&st.empty()?"YES":"NO");}
