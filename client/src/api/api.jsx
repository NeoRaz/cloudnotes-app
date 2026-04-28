import axios from 'axios';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import { auth_routes } from "../feature-module/router/all_routes";
import { aesDecrypt, aesEncrypt } from '../utils/crypto';
import enErrors from '../languages/enErrors.json';

const RESPONSE_TYPE = {
    JSON: 'json',
    BLOB: 'blob',
};

const baseUrl = process.env.REACT_APP_API_BASE_URL;

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST',
    'Cache-Control': 'no-store,no-cache,must-revalidate',
    Vary: 'Origin',
};

const api = axios.create({
    baseURL: baseUrl,
    headers: headers,
});

const notifySuccess = (message) => {
    toast.success(message, {
        duration: 5000,
        id: message,
    });
};

const notifyError = (message) => {
    toast.error(message, {
        duration: 5000,
        id: message,
    });
};

const logoutUser = () => {
    sessionStorage.clear();
    window.location.href = auth_routes.login;
};

export async function getRequest(
    url,
    params,
    callbackResponse = null,
    callbackError = null,
    responseType = RESPONSE_TYPE.JSON
) {
    try {
        const response = await api.get(url, {
            params: { ...params },
            responseType,
        });

        if (callbackResponse) {
            callbackResponse(response);
        } else {
            window.location.reload();
        }

        return response;
    } catch (error) {
        if (callbackError) {
            callbackError(error);
        } else {
            if (error.response?.status === 401) {
                logoutUser();
            };

            if (enErrors.hasOwnProperty(error.response.data.error)) {
                notifyError(enErrors[error.response.data.error]);

                return;
            };

            notifyError(
                enErrors.general_error
            );
        }
    }
}

export async function postRequest(
    url,
    params,
    data = {},
    callbackResponse = null,
    callbackError = null,
    responseType = RESPONSE_TYPE.JSON
) {
    try {
        const response = await api.post(url, data, {
            params: { ...params },
            responseType,
        });

        const { data: responseData } = response.data;

        if (callbackResponse) {
            callbackResponse(responseData);
        } else {
            window.location.reload();
        }

        return responseData;
    } catch (error) {
        if (callbackError) {
            callbackError(error);
        } else {
            if (error.response?.status === 401) {
                logoutUser();
            }

            if (enErrors.hasOwnProperty(error.response.data.error)) {
                notifyError(enErrors[error.response.data.error]);
            } else {
                notifyError(enErrors.general_error);
            }
        }
        throw error; // Ensure the error is re-thrown to be caught by the calling function
    }
}


export async function postLoginRequest(
    url,
    data = {},
    callbackResponse,
    responseType = RESPONSE_TYPE.JSON
) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST',
            'Cache-Control': 'no-store,no-cache,must-revalidate',
            Vary: 'Origin',
        },
        body: JSON.stringify(data),
    };

    let fetchUrl = baseUrl + url;

    try {
        const response = await fetch(fetchUrl, requestOptions);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }
        const responseData = await response.json();
        if (callbackResponse) {
            return callbackResponse(responseData);
        } else {
            window.location.reload();
        }
    } catch (error) {
        if (enErrors.hasOwnProperty(error.message)) {
            notifyError(enErrors[error.message]);
        } else {
            notifyError(enErrors.general_error);
        }
        throw error; // Ensure the error is re-thrown to be caught by the calling function
    }
}


export async function getRefreshTokenRequest() {
    const decryptedRefreshToken = aesDecrypt(sessionStorage.getItem('refresh_token') || '');

    if (decryptedRefreshToken === '') {
        logoutUser();
    }

    try {
        const response = await api.post(
            'refresh-token',
            {
                grant_type: 'refresh_token',
                client_id: process.env.REACT_APP_CLIENT_ID,
                client_secret: process.env.REACT_APP_CLIENT_SECRET,
                refresh_token: decryptedRefreshToken,
            }, {
            responseType: RESPONSE_TYPE.JSON
        });

        const { access_token, refresh_token } = response.data;

        sessionStorage.setItem('access_token', access_token);
        const newEncryptedRefreshToken = aesEncrypt(refresh_token);
        sessionStorage.setItem('refresh_token', newEncryptedRefreshToken);
    } catch (error) {
        if (enErrors.hasOwnProperty(error.response.data.error)) {
            notifyError(enErrors[error.response.data.error]);

            return;
        }

        notifyError(
            enErrors.general_error
        );
    }
}

export async function getFileRequest(
    url,
    params,
    filename,
    callbackError = null,
    responseType = RESPONSE_TYPE.BLOB
) {
    try {
        const response = await api.get(url, {
            params: { ...params },
            responseType,
        });

        const blob = new Blob([response.data], {
            type: response.headers['content-type'],
        });
        saveAs(blob, filename);
    } catch (error) {
        if (callbackError) {
            callbackError(error);
        } else {
            notifyError(
                error.response.data.message ?? error.response.data.error
            );
        }
    }
}

export async function postFileRequest(
    url,
    params,
    file,
    callbackResponse = null,
    callbackError = null,
    responseType = RESPONSE_TYPE.JSON
) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(url, formData, {
            params: {
                ...params,
            },
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            responseType,
        });

        if (callbackResponse) {
            callbackResponse(response.data);
        }
    } catch (error) {
        if (callbackError) {
            callbackError(error);
        } else {
            notifyError(
                error.response.data.message ?? error.response.data.error
            );
        }
    }
}


api.interceptors.request.use(
    (config) => {
        const accessToken = sessionStorage.getItem('access_token');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
);
