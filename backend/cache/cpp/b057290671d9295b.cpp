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
        sort(f.begin(),f.end());
        int s=f.size();
        
        for (int i=0;i<f.size();i++){
            if (k>=f[i]){
                k-=f[i];
                s--;
            } else {
                break;
            }
        }
        cout<<max(1,s)<<endl;
    }
}