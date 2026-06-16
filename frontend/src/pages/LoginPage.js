import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";

const ROLE_ROUTES = {
  doctor: "/doctor",
  nurse: "/nurse",
  head_doctor: "/head-doctor",
  admin: "/admin",
};

const DEMO_CREDS = [
  {
    username: "doctor1",
    password: "doctor123",
    role: "Doctor",
    color: "#00d4ff",
  },
  {
    username: "nurse1",
    password: "nurse123",
    role: "Nurse",
    color: "#00ff87",
  },
  {
    username: "head1",
    password: "head123",
    role: "Head Doctor",
    color: "#a78bfa",
  },
  {
    username: "admin1",
    password: "admin123",
    role: "Admin",
    color: "#ffd700",
  },
];

export default function LoginPage() {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);

  const { login } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {

    setParticles(
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      }))
    );

  }, []);

  // LOGIN
  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      // CHECK REGISTERED USERS
      const users =
        JSON.parse(localStorage.getItem("nfhis_users")) || [];

      const foundUser = users.find(
        (u) =>
          u.username === username &&
          u.password === password
      );

      // LOGIN REGISTERED USER
      if (foundUser) {

        localStorage.setItem(
          "currentUser",
          JSON.stringify(foundUser)
        );

        navigate(
          ROLE_ROUTES[foundUser.role] || "/doctor"
        );

        return;
      }

      // DEMO LOGIN
      const user = await login(username, password);

      navigate(
        ROLE_ROUTES[user.role] || "/doctor"
      );

    } catch {

      setError(
        "Invalid credentials. Register or use demo accounts below."
      );

    } finally {

      setLoading(false);

    }
  };

  // QUICK LOGIN
  const quickLogin = async (cred) => {

    setUsername(cred.username);
    setPassword(cred.password);

    setLoading(true);

    try {

      const user = await login(
        cred.username,
        cred.password
      );

      navigate(
        ROLE_ROUTES[user.role] || "/doctor"
      );

    } catch {

      setError("Login failed");

    } finally {

      setLoading(false);

    }
  };

  return (

    <div
      className="
        min-h-screen
        relative
        overflow-hidden
        flex items-center justify-center
      "
      style={{
        backgroundColor: "#050a14",
      }}
    >

      {/* GRID */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* GLOW */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%, rgba(0,212,255,0.15) 0%, transparent 60%)",
        }}
      />

      {/* PARTICLES */}
      {particles.map((p) => (

        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "rgba(0,212,255,0.6)",
            boxShadow: "0 0 6px rgba(0,212,255,0.8)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />

      ))}

      <div className="
        relative z-10
        w-full max-w-5xl
        mx-auto px-6
        grid grid-cols-1 lg:grid-cols-2
        gap-8 items-center
      ">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="hidden lg:block"
        >

          <div className="mb-6">

            <div className="
              flex items-center gap-3
              mb-4
            ">

              <div
                className="
                  w-12 h-12 rounded-2xl
                  flex items-center justify-center
                  text-2xl
                "
                style={{
                  background:
                    "rgba(0,212,255,0.15)",
                  border:
                    "1px solid rgba(0,212,255,0.3)",
                }}
              >
                🏥
              </div>

              <div>

                <p className="
                  text-cyan-400
                  text-xs font-semibold
                  tracking-[0.2em]
                  uppercase
                ">
                  Government of India
                </p>

                <p className="
                  text-white/40 text-xs
                ">
                  Ministry of Health & Family Welfare
                </p>

              </div>

            </div>

            <h1 className="
              font-display
              text-4xl
              font-bold
              text-white
              leading-tight
              mb-2
            ">
              National Federated
              <br />

              <span className="neon-cyan">
                Healthcare Intelligence
              </span>

              <br />

              System
            </h1>

            <p className="
              text-blue-300/60
              text-sm
              leading-relaxed
              mt-4
            ">
              AI-powered federated learning platform
              connecting hospitals across India
              for real-time disease prediction,
              medical analytics,
              and patient safety monitoring.
            </p>

          </div>

          {/* STATS */}
          <div className="
            grid grid-cols-2
            gap-3 mt-8
          ">

            {[
              {
                label: "Hospitals Connected",
                value: "24",
              },
              {
                label: "FL Rounds",
                value: "15",
              },
              {
                label: "Patients Monitored",
                value: "3,600+",
              },
              {
                label: "Accuracy",
                value: "88.4%",
              },
            ].map((stat) => (

              <div
                key={stat.label}
                className="
                  glass rounded-xl p-4
                "
              >

                <div className="
                  text-xl font-bold neon-cyan
                ">
                  {stat.value}
                </div>

                <div className="
                  text-xs text-blue-300/50 mt-0.5
                ">
                  {stat.label}
                </div>

              </div>

            ))}

          </div>

        </motion.div>

        {/* RIGHT */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.2,
          }}
        >

          <div
            className="
              glass rounded-2xl p-8
            "
            style={{
              border:
                "1px solid rgba(0,212,255,0.15)",
            }}
          >

            {/* HEADER */}
            <div className="
              mb-8 text-center lg:text-left
            ">

              <h2 className="
                font-display
                text-2xl font-bold
                text-white
              ">
                Secure Sign In
              </h2>

              <p className="
                text-blue-300/50
                text-sm mt-1
              ">
                Access your healthcare dashboard
              </p>

            </div>

            {/* ERROR */}
            {error && (

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="
                  mb-4 px-4 py-3
                  rounded-xl text-sm
                "
                style={{
                  background:
                    "rgba(255,59,92,0.12)",
                  border:
                    "1px solid rgba(255,59,92,0.25)",
                  color: "#ff6b8a",
                }}
              >
                {error}
              </motion.div>

            )}

            {/* FORM */}
            <form
              onSubmit={handleLogin}
              className="space-y-4"
            >

              <div>

                <label className="
                  block text-xs font-semibold
                  text-blue-300/60
                  uppercase tracking-wider
                  mb-1.5
                ">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  className="input-field"
                  placeholder="Enter username"
                  required
                />

              </div>

              <div>

                <label className="
                  block text-xs font-semibold
                  text-blue-300/60
                  uppercase tracking-wider
                  mb-1.5
                ">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="input-field"
                  placeholder="Enter password"
                  required
                />

              </div>

              <motion.button
                type="submit"
                disabled={loading}
                className="
                  btn-primary w-full
                  flex items-center
                  justify-center gap-2 mt-2
                "
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >

                {loading ? (

                  <>

                    <motion.div
                      className="
                        w-4 h-4 border-2
                        border-white rounded-full
                      "
                      style={{
                        borderTopColor:
                          "transparent",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />

                    Authenticating...

                  </>

                ) : (

                  "Sign In →"

                )}

              </motion.button>

            </form>

            {/* REGISTER */}
            <div className="
              mt-5 text-center
            ">

              <button
                onClick={() =>
                  navigate("/register")
                }
                className="
                  text-cyan-300 text-sm
                  hover:text-cyan-200
                  transition-all
                "
              >
                Not registered yet? Register now
              </button>

            </div>

            {/* DEMO */}
            <div className="mt-8">

              <p className="
                text-xs text-blue-300/40
                text-center uppercase
                tracking-wider mb-3
              ">
                Quick Demo Access
              </p>

              <div className="
                grid grid-cols-2 gap-2
              ">

                {DEMO_CREDS.map((cred) => (

                  <motion.button
                    key={cred.username}
                    onClick={() =>
                      quickLogin(cred)
                    }
                    className="
                      p-3 rounded-xl text-left
                      transition-all duration-200
                    "
                    style={{
                      background: `rgba(${
                        cred.color === "#00d4ff"
                          ? "0,212,255"
                          : cred.color === "#00ff87"
                          ? "0,255,135"
                          : cred.color === "#a78bfa"
                          ? "167,139,250"
                          : "255,215,0"
                      },0.07)`,

                      border:
                        `1px solid ${cred.color}30`,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >

                    <div
                      className="
                        text-xs font-semibold
                      "
                      style={{
                        color: cred.color,
                      }}
                    >
                      {cred.role}
                    </div>

                    <div className="
                      text-xs text-white/30 mt-0.5
                    ">
                      {cred.username}
                    </div>

                  </motion.button>

                ))}

              </div>

            </div>

          </div>

        </motion.div>

      </div>

    </div>
  );
}