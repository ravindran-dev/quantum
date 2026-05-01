async function test() {
  const code = `#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    cout << "Hello, Quantum C++!" << endl;\n    return 0;\n}`;
  try {
    console.log("Sending request...");
    const start = Date.now();
    const res = await fetch('http://localhost:5000/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language: 'cpp', input: '' })
    });
    const data = await res.json();
    console.log("Response in", Date.now() - start, "ms:");
    console.dir(data, {depth: null});
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
