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
        sort(a.begin(),a.end());
        int c=1;
        for (int i:a){
            r[i]++;
        }
        int maxm=0;
        int num=0;
        for (auto i:r){
            if (i.second>maxm){
                maxm=i.second;
                num=i.first;
            }
        }
        int s= n;
        vector<pair<int, int>> pr(r.begin(),r.end());
        sort(pr.begin(),pr.end(),[](pair<int, int>a,pair<int, int>b){
            return a.second>b.second;
        });
        s-=pr[0].second;
        for (int i=1;i<pr.size();i++){
            if (s && k){
                s-=pr[i].second;
                k--;
                c++;
            } else {
                break;
            }
        }
        cout<<c<<endl;
    }
}