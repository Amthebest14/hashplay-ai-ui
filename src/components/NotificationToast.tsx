import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { Hammer, Award, AlertCircle } from 'lucide-react';
import gsap from 'gsap';

export default function NotificationToast() {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-4 pointer-events-none">
            <AnimatePresence>
                {notifications.map((n) => (
                    <ToastItem key={n.id} notification={n} onRemove={() => removeNotification(n.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function ToastItem({ notification, onRemove }: { notification: any, onRemove: () => void }) {
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (progressRef.current) {
            gsap.fromTo(progressRef.current,
                { scaleX: 1 },
                { scaleX: 0, duration: (notification.duration || 6000) / 1000, ease: 'none' }
            );
        }
    }, [notification.duration]);

    const isWin = notification.type === 'win';
    const isMine = notification.type === 'mine';
    const isError = notification.type === 'error';

    const glowColor = isWin ? 'rgba(0, 242, 255, 0.4)' : isMine ? 'rgba(0, 193, 110, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    const borderColor = isWin ? 'border-electric-cyan/50' : isMine ? 'border-hedera-green/50' : 'border-red-500/50';

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={`pointer-events-auto glass-panel w-80 p-5 rounded-2xl border ${borderColor} shadow-2xl relative overflow-hidden`}
            style={{ boxShadow: `0 10px 40px -10px ${glowColor}` }}
        >
            <div className="flex gap-4 items-start">
                <div className={`p-2 rounded-xl bg-black/40 ${isWin ? 'text-electric-cyan' : isMine ? 'text-hedera-green' : 'text-red-400'}`}>
                    {isWin && <Award size={20} />}
                    {isMine && <Hammer size={20} />}
                    {isError && <AlertCircle size={20} />}
                </div>

                <div className="flex-1 flex flex-col gap-1">
                    <h4 className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-bold">
                        {isWin ? 'Vein Discovered' : isMine ? 'Mining Success' : 'System Alert'}
                    </h4>
                    <p className="text-sm text-white font-medium leading-relaxed">
                        {notification.message}
                    </p>
                    {notification.amount && (
                        <div className={`text-lg font-bold mt-1 ${isWin ? 'text-electric-cyan' : 'text-hedera-green'}`}>
                            {notification.amount}
                        </div>
                    )}
                </div>

                <button
                    onClick={onRemove}
                    className="text-white/20 hover:text-white transition-colors"
                >
                    ×
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
                <div
                    ref={progressRef}
                    className={`h-full origin-left ${isWin ? 'bg-electric-cyan' : isMine ? 'bg-hedera-green' : 'bg-red-500'}`}
                />
            </div>
        </motion.div>
    );
}
