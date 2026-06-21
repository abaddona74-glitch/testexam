function LoadingScreen() {
  try {
    const [dots, setDots] = React.useState('');
    const [isMuted, setIsMuted] = React.useState(false);
    const audioRef = React.useRef(null);

    const toggleSound = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            if (isMuted) {
                audioRef.current.play().catch(console.error);
            }
        }
    };

    React.useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = 0.4;
      }
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="flex flex-col items-center justify-center w-full h-full relative" data-name="loading-screen" data-file="components/LoadingScreen.js">
        
        <audio
          ref={audioRef}
          src="https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg"
          loop
          muted={isMuted}
          autoPlay
        />

        <button 
          onClick={toggleSound} 
          className="absolute top-6 right-6 px-3 py-2 rounded-full border-2 border-[var(--sketch-color)] text-[var(--sketch-color)] hover:bg-[var(--sketch-color)] hover:text-[var(--bg-color)] transition-colors opacity-70 hover:opacity-100 flex items-center gap-2 z-50"
          title="Ovozni yoqish/o'chirish"
        >
          <div className={isMuted ? "icon-volume-x text-lg" : "icon-volume-2 text-lg"}></div>
          <span className="text-sm font-bold tracking-wider">{isMuted ? "OVOZNI YOQISH" : "OVOZNI O'CHIRISH"}</span>
        </button>

        {/* Drawing style container */}
        <div className="relative w-64 h-64 overflow-hidden flex items-end justify-center pb-12">
            
            {/* The Ship */}
            <div className="absolute animate-rock z-20 bottom-8">
                <svg width="140" height="140" viewBox="0 0 140 140" className="opacity-90">
                    {/* Mast */}
                    <path d="M 70,20 L 70,100" className="sketch-stroke" />
                    <path d="M 72,22 L 72,100" className="sketch-stroke" opacity="0.5" />
                    
                    {/* Main Sail (Right) */}
                    <path d="M 70,30 Q 110,50 115,90 L 70,90 Z" className="sketch-stroke sketch-fill" />
                    <path d="M 75,40 Q 100,60 105,85 L 75,85" className="sketch-stroke" opacity="0.4" />
                    
                    {/* Front Sail (Left) */}
                    <path d="M 70,35 Q 35,55 30,85 L 65,85 Z" className="sketch-stroke sketch-fill" />
                    <path d="M 65,45 Q 45,60 40,80 L 60,80" className="sketch-stroke" opacity="0.4" />
                    
                    {/* Flag */}
                    <g className="animate-flutter">
                        <path d="M 70,20 L 95,25 L 70,30 Z" className="sketch-stroke sketch-fill" />
                    </g>
                    
                    {/* Hull */}
                    <path d="M 20,95 L 120,95 L 100,120 L 35,120 Z" className="sketch-stroke sketch-fill" />
                    <path d="M 25,102 L 115,102 M 30,110 L 105,110" className="sketch-stroke" opacity="0.4" />
                    
                    {/* Windows / Details */}
                    <circle cx="50" cy="108" r="3" className="sketch-stroke" />
                    <circle cx="70" cy="108" r="3" className="sketch-stroke" />
                    <circle cx="90" cy="108" r="3" className="sketch-stroke" />
                </svg>
            </div>

            {/* The Waves */}
            <div className="absolute bottom-0 w-[200%] h-24 flex items-end z-30 opacity-95">
                {/* Wave layer 1 */}
                <svg className="absolute w-full h-[100px] animate-wave-1" viewBox="0 0 800 100" preserveAspectRatio="none">
                    <path d="M 0,30 Q 50,10 100,30 T 200,30 T 300,30 T 400,30 T 500,30 T 600,30 T 700,30 T 800,30 L 800,100 L 0,100 Z" className="water-stroke water-fill" />
                </svg>
                {/* Wave layer 2 */}
                <svg className="absolute w-full h-[100px] animate-wave-2 mb-2 ml-10 opacity-90" viewBox="0 0 800 100" preserveAspectRatio="none">
                    <path d="M 0,40 Q 50,20 100,40 T 200,40 T 300,40 T 400,40 T 500,40 T 600,40 T 700,40 T 800,40 L 800,100 L 0,100 Z" className="water-stroke water-fill" />
                </svg>
                {/* Wave layer 3 */}
                <svg className="absolute w-full h-[100px] animate-wave-3 mb-4 ml-20 opacity-80" viewBox="0 0 800 100" preserveAspectRatio="none">
                    <path d="M 0,50 Q 50,30 100,50 T 200,50 T 300,50 T 400,50 T 500,50 T 600,50 T 700,50 T 800,50 L 800,100 L 0,100 Z" className="water-stroke water-fill" />
                </svg>
            </div>
            
            {/* Birds (Background) */}
            <svg width="40" height="20" className="absolute top-4 right-8 opacity-60 animate-bird-1 overflow-visible z-10">
                <g className="animate-flap-1">
                    <path d="M 0,10 Q 10,0 20,10 Q 30,0 40,10" className="sketch-stroke" />
                </g>
            </svg>
            <svg width="30" height="15" className="absolute top-10 left-4 opacity-40 animate-bird-2 overflow-visible z-10">
                <g className="animate-flap-2">
                    <path d="M 0,8 Q 7,0 15,8 Q 22,0 30,8" className="sketch-stroke" />
                </g>
            </svg>
            <svg width="25" height="12" className="absolute top-8 right-24 opacity-50 animate-bird-3 overflow-visible z-10">
                <g className="animate-flap-3">
                    <path d="M 0,6 Q 6,0 12,6 Q 18,0 25,6" className="sketch-stroke" />
                </g>
            </svg>
            <svg width="35" height="18" className="absolute top-16 right-1/3 opacity-30 animate-bird-4 overflow-visible z-10">
                <g className="animate-flap-4">
                    <path d="M 0,9 Q 8,0 17,9 Q 26,0 35,9" className="sketch-stroke" />
                </g>
            </svg>
            <svg width="20" height="10" className="absolute top-6 left-1/4 opacity-40 animate-bird-5 overflow-visible z-10">
                <g className="animate-flap-5">
                    <path d="M 0,5 Q 5,0 10,5 Q 15,0 20,5" className="sketch-stroke" />
                </g>
            </svg>
        </div>

        {/* Loading Text */}
        <div className="mt-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold tracking-widest text-[var(--sketch-color)] opacity-90">
            Yuklanmoqda{dots}
          </h2>
          <p className="mt-2 text-sm opacity-60 italic">Iltimos kuting...</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('LoadingScreen component error:', error);
    return null;
  }
}