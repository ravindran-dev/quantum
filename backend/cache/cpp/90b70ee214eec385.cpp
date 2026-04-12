#include <bits/stdc++.h>
using namespace std;

int main() {
    long long n;
    cin>>n;
    int mod=1e9+7;
    vector<long long>dp(n+1,0);
    dp[0]=1;
    for (long long i=1;i<=n;i++){
        dp[i]=(dp[i-1]*i);
    }
    cout<<dp[n]<<endl;
}