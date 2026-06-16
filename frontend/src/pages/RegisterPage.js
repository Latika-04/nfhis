import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    username: "",
    password: "",
    role: "doctor",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─────────────────────────────
  // HANDLE INPUT
  // ─────────────────────────────

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  };

  // ─────────────────────────────
  // REGISTER
  // ─────────────────────────────

  const handleRegister = (e) => {

    e.preventDefault();

    setError("");
    setSuccess("");

    // GET EXISTING USERS
    const users =
      JSON.parse(
        localStorage.getItem("nfhis_users")
      ) || [];

    // CHECK DUPLICATE USERNAME
    const existingUser = users.find(
      (u) =>
        u.username?.trim().toLowerCase() ===
        form.username.trim().toLowerCase()
    );

    if (existingUser) {

      setError(
        "Username already exists"
      );

      return;
    }

    // CHECK DUPLICATE EMAIL
    const existingEmail = users.find(
      (u) =>
        u.email?.trim().toLowerCase() ===
        form.email.trim().toLowerCase()
    );

    if (existingEmail) {

      setError(
        "Email already registered"
      );

      return;
    }

    // CREATE NEW USER
    const newUser = {
      id: Date.now(),

      fullName:
        form.fullName.trim(),

      email:
        form.email.trim(),

      username:
        form.username.trim(),

      password:
        form.password,

      role:
        form.role,

      createdAt:
        new Date().toISOString(),
    };

    // SAVE USER
    users.push(newUser);

    localStorage.setItem(
      "nfhis_users",
      JSON.stringify(users)
    );

    // SUCCESS
    setSuccess(
      "Registration successful!"
    );

    // RESET FORM
    setForm({
      fullName: "",
      email: "",
      username: "",
      password: "",
      role: "doctor",
    });

    // REDIRECT
    setTimeout(() => {

      navigate("/");

    }, 1500);

  };

  return (

    <div
      className="
        min-h-screen
        flex items-center
        justify-center
        px-6
        relative
        overflow-hidden
      "
      style={{
        background: "#050a14",
      }}
    >

      {/* GRID */}
      <div className="
        absolute inset-0
        bg-grid opacity-30
      " />

      {/* GLOW */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(0,212,255,0.12), transparent 60%)",
        }}
      />

      {/* CARD */}
      <motion.div

        initial={{
          opacity: 0,
          y: 30,
        }}

        animate={{
          opacity: 1,
          y: 0,
        }}

        transition={{
          duration: 0.7,
        }}

        className="
          relative z-10
          w-full
          max-w-xl
        "
      >

        <div
          className="
            glass
            rounded-3xl
            p-8
            backdrop-blur-xl
          "
          style={{
            border:
              "1px solid rgba(0,212,255,0.15)",
            background:
              "rgba(4,15,28,0.92)",
          }}
        >

          {/* HEADER */}
          <div className="
            mb-8
            text-center
          ">

            <div
              className="
                w-20 h-20
                mx-auto mb-5
                rounded-3xl
                flex items-center
                justify-center
                text-4xl
              "
              style={{
                background:
                  "rgba(0,212,255,0.12)",

                border:
                  "1px solid rgba(0,212,255,0.2)",
              }}
            >
              🏥
            </div>

            <h1 className="
              text-5xl
              font-bold
              text-white
              mb-3
            ">
              Create Account
            </h1>

            <p className="
              text-cyan-300/60
              text-lg
            ">
              Register into NFHIS Healthcare Intelligence Platform
            </p>

          </div>

          {/* ERROR */}
          {error && (

            <div
              className="
                mb-5
                rounded-2xl
                px-4 py-3
                text-sm
              "
              style={{
                background:
                  "rgba(255,59,92,0.12)",

                border:
                  "1px solid rgba(255,59,92,0.2)",

                color:
                  "#ff6b8a",
              }}
            >
              {error}
            </div>

          )}

          {/* SUCCESS */}
          {success && (

            <div
              className="
                mb-5
                rounded-2xl
                px-4 py-3
                text-sm
              "
              style={{
                background:
                  "rgba(0,255,170,0.12)",

                border:
                  "1px solid rgba(0,255,170,0.2)",

                color:
                  "#4dffbf",
              }}
            >
              {success}
            </div>

          )}

          {/* FORM */}
          <form
            onSubmit={handleRegister}
            className="space-y-4"
          >

            {/* FULL NAME */}
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              className="input-field"
              value={form.fullName}
              onChange={handleChange}
              required
            />

            {/* EMAIL */}
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              className="input-field"
              value={form.email}
              onChange={handleChange}
              required
            />

            {/* USERNAME */}
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="input-field"
              value={form.username}
              onChange={handleChange}
              required
            />

            {/* PASSWORD */}
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="input-field"
              value={form.password}
              onChange={handleChange}
              required
            />

            {/* ROLE */}
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="input-field"
            >

              <option value="doctor">
                Doctor
              </option>

              <option value="nurse">
                Nurse
              </option>

              <option value="head_doctor">
                Head Doctor
              </option>

              <option value="admin">
                Admin
              </option>

            </select>

            {/* BUTTON */}
            <motion.button

              whileHover={{
                scale: 1.02,
              }}

              whileTap={{
                scale: 0.98,
              }}

              type="submit"

              className="
                btn-primary
                w-full
                mt-3
                py-4
                rounded-2xl
                text-lg
                font-semibold
              "
            >

              Register Account →

            </motion.button>

          </form>

          {/* LOGIN */}
          <div className="
            mt-6
            text-center
          ">

            <button
              onClick={() => navigate("/")}
              className="
                text-cyan-300
                text-sm
                hover:text-cyan-200
                transition-all
              "
            >

              Already registered? Login

            </button>

          </div>

        </div>

      </motion.div>

    </div>

  );
}