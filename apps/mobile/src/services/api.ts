import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// If testing on physical device, use your computer's local IP instead:
// const API_URL = 'http://192.168.1.XXX:3001';
console.log("API Base URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
