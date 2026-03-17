#include <bits/stdc++.h>
using namespace std;

int main() {
    int t;
    cin>>t;
    while(t--){
        int n,k;
    
        cin>>n>>k;
        vector<int>a(n);
        for (int i=0;i<n;i++){
            cin>>a[i];
        }
        unordered_map<int,int>r;
        
        int c=1;
        for (int i:a){
            r[i]++;
        }
        vector<int>f;

        for (auto i:r){
            f.push_back(i.second);
        }
        sort(f.begin(),f.end(),greater<int>());
        int s=n-f[0];
        
        for (int i=1;i<f.size();i++){
            if (k>0 && s>=f[i]){
                s-=f[i];
                k--;
                c++;
            } else {
                break;
            }
        }
        cout<<c<<endl;
    }
}