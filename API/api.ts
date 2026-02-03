import axios from "axios";

// Create an Axios instance
const api = axios.create({
  //baseURL: "https://chrimgtapp.xenosyslab.com/api", // 👈 your base URL
  //baseURL: "https://demochrimgtapp.xenosyslab.com/api", // 👈 your base URL for Demo
//   timeout: 10000, // optional: request timeout in ms,
 baseURL: "https://dev-mgtappapi.omniclinic.io/api", // 👈 your base URL for Dev other server
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
