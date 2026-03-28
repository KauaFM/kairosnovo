import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EventNotifier = () => {
    useEffect(() => {
        let isChecking = false;

        const requestPerm = async () => {
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                await Notification.requestPermission();
            }
        };

        requestPerm();

        const checkTasks = async () => {
            if (isChecking) return;
            if ('Notification' in window && Notification.permission !== 'granted') return;

            isChecking = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // [BUG #11 FIX] Usar data local para evitar deslocamento UTC
                const _now = new Date();
                const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
                const { data: tasks } = await supabase
                    .from('tasks')
                    .select('id, title, time_start, state')
                    .eq('user_id', session.user.id)
                    .eq('scheduled_date', today)
                    .neq('state', 'done');

                if (!tasks || tasks.length === 0) return;

                const now = new Date();

                tasks.forEach(task => {
                    const horaStart = task.time_start;
                    if (!horaStart) return;

                    const [taskH, taskM] = horaStart.split(':').map(Number);
                    if (isNaN(taskH) || isNaN(taskM)) return;

                    const taskDate = new Date();
                    taskDate.setHours(taskH, taskM, 0, 0);

                    const diffMs = taskDate - now;
                    const diffMins = Math.floor(diffMs / 60000);

                    if (diffMins === 15 || diffMins === 0) {
                        const notifiedKey = `notified_${task.id}_${now.toDateString()}_${diffMins}`;
                        if (!localStorage.getItem(notifiedKey)) {
                            new Notification('SISTEMA ORVAX', {
                                body: diffMins === 0 ? `ATENÇÃO: ${task.title} começando agora.` : `ALERTA: 15 minutos para ${task.title}.`,
                                icon: '/orvax.svg',
                            });
                            localStorage.setItem(notifiedKey, 'true');
                        }
                    }
                });
            } catch (error) {
                console.error('Error checking notifications:', error);
            } finally {
                isChecking = false;
            }
        };

        const interval = setInterval(checkTasks, 15000);
        checkTasks();

        return () => clearInterval(interval);
    }, []);

    return null;
};

export default EventNotifier;
