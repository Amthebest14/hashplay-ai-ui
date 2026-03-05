import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type NotificationType = 'win' | 'mine' | 'error' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    amount?: string;
    duration?: number;
}

interface NotificationContextType {
    notify: (type: NotificationType, message: string, amount?: string, duration?: number) => void;
    notifications: Notification[];
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const notify = useCallback((type: NotificationType, message: string, amount?: string, duration: number = 6000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications(prev => [...prev, { id, type, message, amount, duration }]);

        setTimeout(() => {
            removeNotification(id);
        }, duration);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ notify, notifications, removeNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
