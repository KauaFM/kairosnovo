import { useEffect } from 'react';
import { startNotifications, stopNotifications, refreshNotifications } from '../services/notifications';
import { appEvents } from '../lib/events';

// Casca fina do sistema de notificações (src/services/notifications.js).
// Monta após o login; re-verifica na hora quando algo muda no app
// (criação de tarefa/evento/hábito, escrita do agente via realtime bridge).
const EventNotifier = () => {
    useEffect(() => {
        startNotifications();
        const unsub = appEvents.subscribe(() => refreshNotifications());
        return () => {
            unsub();
            stopNotifications();
        };
    }, []);

    return null;
};

export default EventNotifier;
