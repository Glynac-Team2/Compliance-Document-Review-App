import React from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Right-hand illustrated panel shared by Login and Signup.
 * headline: string (use \n for a manual line break)
 */
export default function AuthVisual({ headline = "Every submission,\nverified before it moves." }) {
  return (
    <div className="relative hidden lg:block lg:col-span-6 overflow-hidden rounded-[28px] m-4">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 75% 0%, #E9D8A6 0%, transparent 45%)," +
            "linear-gradient(180deg, #1B1035 0%, #4A2A5C 32%, #B4663F 62%, #E7A75E 78%, #F4C77E 100%)",
        }}
      />

      {/* headline */}
      <div className="absolute top-16 left-0 right-0 text-center px-16 z-10">
        <p
          className="text-white/95 font-semibold text-2xl leading-snug"
          style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 2px 18px rgba(0,0,0,0.25)" }}
        >
          {headline.split("\n").map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < headline.split("\n").length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      </div>

      {/* drifting birds */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {[
          { top: 130, left: "58%", dur: "16s", delay: "0s" },
          { top: 158, left: "66%", dur: "13s", delay: "-4s" },
          { top: 112, left: "74%", dur: "18s", delay: "-8s" },
        ].map((b, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            className="absolute w-6 h-6"
            style={{
              top: b.top,
              left: b.left,
              animation: `auth-bird-drift ${b.dur} linear infinite`,
              animationDelay: b.delay,
            }}
          >
            <path d="M2 14c3-3 5-4 5-4s2 3 5 3 5-3 5-3 2 1 5 4" />
          </svg>
        ))}
      </div>

      {/* vault / security motif */}
      <svg
        className="absolute left-[9%] bottom-[16%] w-[34%] z-10"
        style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.35))" }}
        viewBox="0 0 200 180"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="10" y="70" width="180" height="100" rx="6" fill="#241436" opacity="0.9" />
        <rect x="10" y="70" width="180" height="14" fill="#3A2450" />
        <rect x="30" y="94" width="26" height="76" fill="#1A0E28" />
        <rect x="66" y="94" width="26" height="76" fill="#1A0E28" />
        <rect x="102" y="94" width="26" height="76" fill="#1A0E28" />
        <rect x="138" y="94" width="26" height="76" fill="#1A0E28" />
        <circle cx="100" cy="50" r="26" fill="#2E1A44" opacity="0.9" />
        <path
          d="M100 30 82 38v12c0 11 7.6 19.3 18 22 10.4-2.7 18-11 18-22V38l-18-8Z"
          fill="none"
          stroke="#6EE7B7"
          strokeWidth="2.2"
          opacity="0.85"
        />
      </svg>

      {/* verified chip */}
      <div className="absolute right-11 bottom-11 z-10 flex items-center gap-2.5 rounded-full border border-white/20 bg-[#14121F]/55 backdrop-blur-md py-2.5 pl-3 pr-4">
        <span
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-400"
          style={{ animation: "auth-pulse-ring 2.4s ease-in-out infinite" }}
        >
          <ShieldCheck size={12} className="text-[#0B2E22]" strokeWidth={3} />
        </span>
        <span className="text-xs font-semibold text-white/90">Document verified</span>
      </div>

      <style>{`
        @keyframes auth-bird-drift {
          0% { transform: translate(0,0); }
          50% { transform: translate(-14px,6px); }
          100% { transform: translate(0,0); }
        }
        @keyframes auth-pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          50% { box-shadow: 0 0 0 7px rgba(52,211,153,0); }
        }
      `}</style>
    </div>
  );
}
