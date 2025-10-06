import axios from "axios";

// Create an Axios instance
const api = axios.create({
  baseURL: "https://chrimgtapp.xenosyslab.com/api", // 👈 your base URL
//   timeout: 10000, // optional: request timeout in ms
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
