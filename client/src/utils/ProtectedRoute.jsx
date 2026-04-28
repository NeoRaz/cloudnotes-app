import { useEffect, useState } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useLocation, useNavigate } from 'react-router-dom';
import TimeOutModal from '../components/modal/TimeOutModal';
import { getRefreshTokenRequest } from '../api/api';
import { auth_routes } from "../feature-module/router/all_routes";

export function ProtectedRoute({ children }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [cached, setCached] = useState(false);
    const [isTimeOutModalOpen, setIsTimeOutModalOpen] = useState(false);
    const timeout = 1000 * 60 * 20;

    const handleOnIdle = () => {
        sessionStorage.clear();
        setIsTimeOutModalOpen(true);
    };

    useIdleTimer({
        timeout,
        onIdle: handleOnIdle,
        onActive: () => null,
        onAction: () => null,
        disabled: !cached,
        debounce: 250,
    });

    useEffect(() => {
        if (!cached) {
            const authRoutesArray = Object.values(auth_routes); // Convert object values to an array
            if (!authRoutesArray.includes(location.pathname)) {
                setCached(true);
            }
        }
    }, [location, cached]);
    

    const tokenType = sessionStorage.getItem('token_type');
    const accessToken = sessionStorage.getItem('access_token');
    const isAuthenticated = (tokenType !== null && tokenType !== 'undefined' && accessToken !== null && accessToken !== 'undefined');

    useEffect(() => {
        if (!isAuthenticated) {
            navigate(auth_routes.login);
        }
    }, [navigate, isAuthenticated]);

    const EXPIRATION_DURATION = 50 * 60 * 1000;

    const [key, setKey] = useState(0);

    useEffect(() => {
        const expirationTime = localStorage.getItem('expiration_time');

        let delay;
        if (expirationTime) {
            const remainingTime = new Date(expirationTime).getTime() - new Date().getTime();
            delay = remainingTime > 0 ? remainingTime : 0;
        } else {
            delay = EXPIRATION_DURATION;
        }

        const newExpirationTime = new Date(new Date().getTime() + EXPIRATION_DURATION);
        localStorage.setItem('expiration_time', newExpirationTime);

        const timer = setTimeout(() => {
            getRefreshTokenRequest();
            setKey(prevKey => prevKey + 1);
        }, delay);

        return () => clearTimeout(timer);
    }, [key]);

    if (!isAuthenticated) {
        return null; // Or a loading spinner
    }

    return (
        <div className="theme-light">
            <div className="wrapper">
                <TimeOutModal isOpen={isTimeOutModalOpen} />
                {children}
            </div>
        </div>
    );
};
