import { useState } from "react";
import { loginUser, registerUser } from "./api";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await loginUser({
          email,
          password,
        });
      } else {
        result = await registerUser({
          name,
          email,
          password,
        });
      }

      localStorage.setItem("token", result.token);

      setSuccess(
        isLogin
          ? "Login successful!"
          : "Registration successful!"
      );

      setTimeout(() => {
        onLogin(result.user);
      }, 300);

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* Logo / Heading */}
        <div className="text-center mb-8">

          <h1 className="text-4xl font-bold">
            ChatNest{" "}
            <span className="text-emerald-400">
              Messenger
            </span>
          </h1>

          <p className="text-slate-400 mt-2">
            Connect. Communicate. Collaborate.
          </p>

        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">

          {/* Tabs */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-7">

            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 rounded-md font-medium transition ${
                isLogin
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2.5 rounded-md font-medium transition ${
                !isLogin
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Register
            </button>

          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold mb-2">
            {isLogin
              ? "Welcome back 👋"
              : "Create your account"}
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            {isLogin
              ? "Login to continue to ChatNest Messenger."
              : "Join ChatNest and start communicating."}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name */}
            {!isLogin && (
              <div>

                <label className="block text-sm text-slate-300 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
                />

              </div>
            )}

            {/* Email */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              />

            </div>

            {/* Password */}
            <div>

              <label className="block text-sm text-slate-300 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition"
              />

            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:cursor-not-allowed text-slate-950 font-bold py-3 rounded-lg transition mt-2"
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Login"
                : "Create Account"}
            </button>

          </form>

          {/* Switch */}
          <div className="text-center mt-6 text-sm text-slate-400">

            {isLogin
              ? "Don't have an account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {isLogin ? "Register" : "Login"}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Auth;