import React from 'react';
import { Sun, Moon } from 'lucide-react';

export const OrvaxHeader = ({ theme, toggleTheme, minimal = false }) => {
    const [coords, setCoords] = React.useState({ lat: '00.00.00', lng: '00.00.00' });

    React.useEffect(() => {
        if (!minimal && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setCoords({
                    lat: position.coords.latitude.toFixed(6),
                    lng: position.coords.longitude.toFixed(6)
                });
            }, (error) => {
                console.warn("Geolocation error:", error);
            });
        }
    }, [minimal]);

    return (
        <div className={`w-full flex ${minimal ? 'justify-end mb-0' : 'justify-between items-end mb-14'} relative z-10 pt-2`}>
            {!minimal && (
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 mb-3 opacity-40">
                        <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                        <span className="text-[9px] font-mono font-black tracking-widest uppercase">Sistema Online</span>
                    </div>
                    <h1 className="text-[44px] font-syncopate font-black tracking-widest leading-none text-[var(--text-main)] mb-1">
                        ORVAX
                    </h1>
                    <span className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase opacity-40 mb-4">
                        V.2_Absolute
                    </span>
                    <div className="h-[3px] w-16 bg-current opacity-30 mt-1"></div>
                </div>
            )}
            <div className={`flex flex-col items-end gap-3.5 ${!minimal ? 'pb-2' : ''}`}>
                <button
                    onClick={toggleTheme}
                    className="relative flex items-center w-20 h-8 p-1 rounded-sm border transition-all duration-500 group"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                    aria-label="Alternar Tema"
                >
                    <div className="absolute -top-[5px] right-0 flex gap-1">
                        <div className={`w-2 h-[2px] transition-colors duration-500 ${theme === 'dark' ? 'bg-[#22c55e] shadow-[0_0_5px_#22c55e]' : 'bg-current opacity-20'}`}></div>
                        <div className={`w-2 h-[2px] transition-colors duration-500 ${theme === 'light' ? 'bg-[#22c55e] shadow-[0_0_5px_#22c55e]' : 'bg-current opacity-20'}`}></div>
                    </div>
                    <div
                        className="absolute h-6 w-8 rounded-sm transition-transform duration-500 z-10 flex items-center justify-center shadow-sm"
                        style={{
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-color)',
                            transform: theme === 'dark' ? 'translateX(0)' : 'translateX(40px)'
                        }}
                    >
                        {theme === 'dark' ? <Sun size={12} strokeWidth={3} /> : <Moon size={12} strokeWidth={3} />}
                    </div>
                    <div className="w-full flex justify-between px-2 z-0 text-[8.5px] font-mono font-bold tracking-[0.2em]">
                        <span className={`transition-opacity duration-300 ${theme === 'dark' ? 'opacity-0' : 'opacity-40'}`}>ESC</span>
                        <span className={`transition-opacity duration-300 ${theme === 'light' ? 'opacity-0' : 'opacity-40'}`}>CLA</span>
                    </div>
                </button>
                {!minimal && (
                    <div className="flex flex-col gap-2 opacity-50 text-[9px] font-mono font-bold tracking-[0.2em] w-[95px]">
                        <div className="flex justify-between items-center border-b border-current/20 pb-1.5">
                            <span className="opacity-60">LAT</span> <span>{coords.lat}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="opacity-60">LNG</span> <span>{coords.lng}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ScrollContainer = ({ children, className = "" }) => (
    <div 
        className={`absolute inset-0 overflow-y-auto overflow-x-hidden px-8 pt-12 pb-32 scroll-smooth ${className}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
        {children}
    </div>
);
