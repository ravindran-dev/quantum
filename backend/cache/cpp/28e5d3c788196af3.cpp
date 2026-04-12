#include <bits/stdc++.h>
using namespace std;

class Trienode{
public:
    Trienode *child[26];
    int pass;
    int end;
    Trienode(){
        pass=0;
        end=0;
        for (int i=0;i<26;i++){
            child[i]=NULL;
        }
    }
};
class Trie{
public:
    Trienode *root;
    Trie(){
        root =new Trienode();
    }
    void insert(string& s){
        Trienode *node=root;
        
        for (char ch:s){
            int ind=ch-'a';
            if (!node->child[ind]){
                node->child[ind] =new Trienode(); 
            }
            node=node->child[ind];
            node->pass++;
        }
        node->end++;
    }
    int get(string& q){
        Trienode *node=root;
        for (char ch:q){
            int ind=ch-'a';
            if (!node->child[ind]){
                return 0;
            }
            node = node->child[ind];
        }
        return node->pass-node->end;
    }

};
vector<int> findCompletePrefixes(vector<string> &names, vector<string> &queries) {
    Trie trie;

    // insert all names
    for (auto &name : names)
        trie.insert(name);

    vector<int> result;

    // process queries
    for (auto &q : queries)
        result.push_back(trie.get(q));

    return result;
}
int main() {
    int n;
    cin >> n;

    vector<string> names(n);
    for (int i = 0; i < n; i++)
        cin >> names[i];

    int q;
    cin >> q;

    vector<string> queries(q);
    for (int i = 0; i < q; i++)
        cin >> queries[i];

    vector<int> result = findCompletePrefixes(names, queries);

    for (int x : result)
        cout << x << " ";
    
    cout << endl;

    return 0;
}