import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "Unexpected error occurred";

    if (error.response) {
      message = error.response.data?.error?.message || message;

      const isLoginAttempt = error.config?.url?.includes("/auth/login");
      if (error.response.status === 401 && !isLoginAttempt) {
        window.location.assign("/login");
      }
    } else if (error.request) {
      message = "Cannot reach the server. Is the backend running?";
    }

    error.message = message;
    return Promise.reject(error);
  }
);

export default api;