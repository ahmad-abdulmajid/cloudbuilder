import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000'
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Unexpected error occurred";

    if (error.response) {
      // Backend responded with an error status (4xx / 5xx)
      message = error.response.data?.error?.message || message;
    } else if (error.request) {
      // Request was sent but no response came back (backend down / network)
      message = "Cannot reach the server. Is the backend running?";
    }

    error.message = message;
    return Promise.reject(error);
  }
);

export default api;