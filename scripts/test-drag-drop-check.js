
const start = async () => {
    try {
        console.log("Fetching...");
        const response = await fetch('http://localhost:3000/api/admin/test-drag-drop-check');
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (error) {
        console.error("Fetch Error:", error);
    }
};

start();
