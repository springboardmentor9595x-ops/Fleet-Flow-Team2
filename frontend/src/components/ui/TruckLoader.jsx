function TruckLoader() {
  return (
    <div className="loader scale-110 sm:scale-125 origin-center my-4 mx-auto select-none pointer-events-none">
      <div className="truckWrapper overflow-hidden relative">
        
        {/* Animated Highway Towers / Lamp Posts */}
        <div className="lampPost lampPost1">
          <svg viewBox="0 0 24 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
            <path d="M12 0V90M7 15H17M5 35H19M3 58H21M1 85H23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 15L19 35M17 15L5 35M5 35L21 58M19 35L3 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <circle cx="12" cy="3" r="3" fill="#00f0ff" className="animate-pulse" />
          </svg>
        </div>

        <div className="lampPost lampPost2">
          <svg viewBox="0 0 24 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
            <path d="M12 0V90M7 15H17M5 35H19M3 58H21M1 85H23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M7 15L19 35M17 15L5 35M5 35L21 58M19 35L3 58" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
            <circle cx="12" cy="3" r="3" fill="#38bdf8" />
          </svg>
        </div>

        {/* Truck Upper Body */}
        <div className="truckBody relative z-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 198 93"
            className="trucksvg"
          >
            <path
              strokeWidth="3"
              stroke="#282828"
              fill="#F83D3D"
              d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z"
            />
            <path
              strokeWidth="3"
              stroke="#282828"
              fill="#7D7C7C"
              d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z"
            />
            <path
              strokeWidth="2"
              stroke="#282828"
              fill="#282828"
              d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z"
            />
            <rect
              strokeWidth="2"
              stroke="#282828"
              fill="#FFFCAB"
              rx="1"
              height="7"
              width="5"
              y="63"
              x="187"
            />
            <rect
              strokeWidth="2"
              stroke="#282828"
              fill="#282828"
              rx="1"
              height="11"
              width="4"
              y="81"
              x="193"
            />
            <rect
              strokeWidth="3"
              stroke="#282828"
              fill="#DFDFDF"
              rx="2.5"
              height="90"
              width="121"
              y="1.5"
              x="6.5"
            />
            <rect
              strokeWidth="2"
              stroke="#282828"
              fill="#DFDFDF"
              rx="2"
              height="4"
              width="6"
              y="84"
              x="1"
            />
          </svg>
        </div>

        {/* Truck Wheels */}
        <div className="truckTires relative z-20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 30 30"
            className="tiresvg animation-spin"
            style={{ animation: 'spin 1.4s linear infinite' }}
          >
            <circle
              strokeWidth="3"
              stroke="#282828"
              fill="#282828"
              r="13.5"
              cy="15"
              cx="15"
            />
            <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
          </svg>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 30 30"
            className="tiresvg"
            style={{ animation: 'spin 1.4s linear infinite' }}
          >
            <circle
              strokeWidth="3"
              stroke="#282828"
              fill="#282828"
              r="13.5"
              cy="15"
              cx="15"
            />
            <circle fill="#DFDFDF" r="7" cy="15" cx="15" />
          </svg>
        </div>

        {/* Driving Road */}
        <div className="road relative z-10" />
      </div>
    </div>
  )
}

export default TruckLoader
