import axios from 'axios';

const BASE_URL = 'http://localhost:8080/api';

const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(
    (config) => {
        const savedUser = localStorage.getItem("cube_user_session");
        if (savedUser) {
            const user = JSON.parse(savedUser);
            if (user.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default client;