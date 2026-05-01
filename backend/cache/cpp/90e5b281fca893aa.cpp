#include <iostream> // Library for input and output
#include <vector>   // Library for dynamic arrays

using namespace std;

int main() {
    int n, target;

    // 1. Getting Input: Size of the array
    cout << "Enter the number of elements: ";
    cin >> n; // Standard input stream

    vector<int> nums(n);
    cout << "Enter " << n << " integers: ";
    for (int i = 0; i < n; i++) {
        cin >> nums[i]; // Filling the array
    }

    // 2. Getting Input: Target value to search
    cout << "Enter the value to search for: ";
    cin >> target;

    // 3. Algorithm: Linear Search
    int foundIndex = -1;
    for (int i = 0; i < n; i++) {
        if (nums[i] == target) {
            foundIndex = i;
            break; // Stop searching once found
        }
    }

    // 4. Outputting the Result
    if (foundIndex != -1) {
        cout << "Value " << target << " found at index: " << foundIndex << endl;
    } else {
        cout << "Value " << target << " not found in the array." << endl;
    }

    return 0; // Exit status
}
