// src/services/AuthService.js
import axios from 'axios';

import { decodeJWT } from 'aws-amplify/auth';


const createAuthenticatedApi = (getSession) => {
    const instance = axios.create({
      baseURL: 'http://localhost:5000', 
    });  
  
    instance.interceptors.request.use(async (config) => {
      try {
        const session = await getSession();
        if (session && session.tokens && session.tokens.accessToken) {
            const token = session.tokens.accessToken.toString();
            config.headers.Authorization = `Bearer ${token}`;
          }
      } catch (error) {
        console.error('Error getting session:', error);
        throw new Error(error);
      }
      return config;
    }, (error) => Promise.reject(error));
  
    return {
      get: instance.get,
      post: instance.post,
      put: instance.put,
      delete: instance.delete
    };
  };
export default createAuthenticatedApi;