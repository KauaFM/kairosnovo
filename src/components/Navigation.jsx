import { Crosshair, Hexagon, Activity, User, Hourglass, Swords, Utensils } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab, isBlogScrolled, isAnyModalOpen }) => {
    // Esconde o menu na aba Blog (sem scroll) ou quando um modal está aberto
    const isHidden = (activeTab === 'focus' && !isBlogScrolled) || isAnyModalOpen;

    return (
        <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[428px] flex justify-center z-50 px-6 pointer-events-none transition-transform duration-700 ease-in-out ${isHidden ? 'translate-y-[150%]' : 'translate-y-0'}`} 
            style={{ color: 'var(--text-main)' }}
        >
            <div
                className="rounded-[40px] w-full max-w-[400px] px-3 py-2.5 flex justify-between items-center border transition-all duration-700 pointer-events-auto relative overflow-hidden backdrop-blur-2xl"
                style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', boxShadow: 'var(--glass-shadow)' }}
            >
                {/* Subtle base glow inside the nav */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundColor: 'var(--text-main)' }}></div>

                <NavItem
                    icon={<Crosshair strokeWidth={1.5} size={22} />}
                    active={activeTab === 'nexus'}
                    onClick={() => setActiveTab('nexus')}
                />
                <NavItem
                    icon={<Hexagon strokeWidth={1.5} size={22} />}
                    active={activeTab === 'vault'}
                    onClick={() => setActiveTab('vault')}
                />
                <NavItem
                    icon={<Utensils strokeWidth={1.5} size={20} />}
                    active={activeTab === 'fitcal'}
                    onClick={() => setActiveTab('fitcal')}
                />

                {/* The Singularity Button - Absolute Monochrome (Inverted) */}
                <div className="relative mx-1">
                    {/* Outer orbital rings (Schematic SVG) */}
                    <svg className={`absolute inset-[-6px] w-12 h-12 animate-[spin_40s_linear_infinite] pointer-events-none transition-opacity duration-300 ${activeTab === 'focus' ? 'opacity-[0.8] text-[#22c55e]' : 'opacity-[0.25]'}`} viewBox="0 0 100 100" style={{ color: 'var(--text-main)' }}>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" />
                        <circle cx="50" cy="5" r="2.5" fill="currentColor" />
                    </svg>

                    <button
                        onClick={() => setActiveTab('focus')}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${activeTab === 'focus' ? 'scale-110 shadow-[0_0_15px_var(--text-main)]' : 'hover:scale-105'}`}
                        style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)', boxShadow: 'var(--glass-shadow)' }}
                    >
                        <Hourglass size={20} strokeWidth={1.5} className={activeTab === 'focus' ? 'animate-pulse' : ''} />
                    </button>
                </div>

                <NavItem
                    icon={<Activity strokeWidth={1.5} size={22} />}
                    active={activeTab === 'telemetry'}
                    onClick={() => setActiveTab('telemetry')}
                />
                <NavItem
                    icon={<Swords strokeWidth={1.5} size={22} />}
                    active={activeTab === 'arena'}
                    onClick={() => setActiveTab('arena')}
                />
                <NavItem
                    icon={<User strokeWidth={1.5} size={22} />}
                    active={activeTab === 'dossier'}
                    onClick={() => setActiveTab('dossier')}
                />
            </div>
        </div>
    );
};

const NavItem = ({ icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-9 h-9 rounded-full transition-all duration-500 relative flex items-center justify-center
      ${active ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
        style={{ color: 'var(--text-main)' }}
    >
        {active && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {/* Outer Subtle Ring */}
                <div className="absolute w-[110%] h-[110%] rounded-full border-[1px]" style={{ borderColor: 'var(--border-color)' }}></div>

                {/* Inner Crisp Ring */}
                <div className="absolute w-[92%] h-[92%] rounded-full border-[1.5px] opacity-40" style={{ borderColor: 'var(--text-main)' }}></div>

                {/* Ethereal Glow */}
                <div className="absolute w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[8px]" style={{ backgroundColor: 'var(--text-main)' }}></div>
            </div>
        )}
        <div className={`relative z-10 transition-transform duration-300 ${active ? 'scale-100' : 'scale-90'}`}
            style={active ? { filter: 'drop-shadow(0 0 5px currentColor)' } : {}}>
            {icon}
        </div>
    </button>
);

export default Navigation;
