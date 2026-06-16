import React from 'react';

export default function LiveICUMonitor() {

  return (

    <div className="
      rounded-3xl
      bg-[#071028]
      border border-cyan-500/10
      p-6 mb-8
    ">

      {/* TOP */}
      <div className="flex items-center justify-between mb-6">

        <div>

          <p className="
            text-xs uppercase tracking-[0.2em]
            text-red-300 mb-2
          ">
            LIVE ICU MONITORING
          </p>

          <h2 className="
            text-3xl font-semibold text-white
          ">
            Real-Time Patient Vitals
          </h2>

        </div>

        <div className="
          px-4 py-2 rounded-xl
          bg-green-400/10
          text-green-300
          text-sm
        ">
          Systems Stable
        </div>

      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ECG */}
        <div className="
          xl:col-span-2
          rounded-3xl
          bg-[#020817]
          p-6
        ">

          <h3 className="
            text-xl text-white font-semibold mb-6
          ">
            ECG Live Stream
          </h3>

          {/* ECG LINE */}
          <div className="
            relative h-[180px]
            rounded-2xl
            bg-cyan-400/5
            overflow-hidden
          ">

            <svg
              viewBox="0 0 1000 200"
              className="absolute inset-0 w-full h-full"
            >

              <path
                d="
                  M0 100
                  L60 100
                  L90 80
                  L120 130
                  L150 40
                  L180 160
                  L220 100
                  L300 100
                  L340 85
                  L360 125
                  L390 50
                  L420 150
                  L460 100
                  L1000 100
                "
                fill="none"
                stroke="#00D4FF"
                strokeWidth="4"
              />

            </svg>

          </div>

        </div>

        {/* VITALS */}
        <div className="space-y-4">

          {/* HEART RATE */}
          <div className="
            rounded-2xl
            bg-[#020817]
            p-5
          ">

            <p className="
              text-xs uppercase tracking-wider
              text-white/40 mb-2
            ">
              Heart Rate
            </p>

            <h3 className="
              text-2xl font-semibold
              text-red-300
            ">
              82 BPM
            </h3>

          </div>

          {/* OXYGEN */}
          <div className="
            rounded-2xl
            bg-[#020817]
            p-5
          ">

            <p className="
              text-xs uppercase tracking-wider
              text-white/40 mb-2
            ">
              Oxygen Level
            </p>

            <h3 className="
              text-2xl font-semibold
              text-cyan-300
            ">
              97%
            </h3>

          </div>

          {/* BP */}
          <div className="
            rounded-2xl
            bg-[#020817]
            p-5
          ">

            <p className="
              text-xs uppercase tracking-wider
              text-white/40 mb-2
            ">
              Blood Pressure
            </p>

            <h3 className="
              text-2xl font-semibold
              text-yellow-300
            ">
              128/84
            </h3>

          </div>

          {/* STATUS */}
          <div className="
            rounded-2xl
            bg-[#020817]
            p-5
          ">

            <p className="
              text-xs uppercase tracking-wider
              text-white/40 mb-2
            ">
              Patient Status
            </p>

            <h3 className="
              text-2xl font-semibold
              text-green-300
            ">
              Stable
            </h3>

          </div>

        </div>

      </div>

    </div>
  );
}