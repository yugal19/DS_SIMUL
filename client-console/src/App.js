import React, { useState } from "react";

export default function App() {
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [status, setStatus] = useState("");

  const API = "http://localhost:3000";

  const handlePut = async () => {
    if (!keyInput || !valueInput) {
      setStatus("❌ Key and Value required");
      return;
    }

    try {
      await fetch(`${API}/sim-put`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput, value: valueInput }),
      });

      setStatus(`✔ PUT sent to Simulator: ${keyInput}`);
    } catch (err) {
      setStatus("❌ Network Error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, #0b0c10, #111111)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, monospace",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "380px",
          background: "#0d0d0d",
          border: "1px solid rgba(168, 85, 247, 0.4)", // purple accent
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 0 25px rgba(168, 85, 247, 0.15)", // soft purple glow
          color: "white",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "20px",
            marginBottom: "18px",
            fontWeight: "600",
            textAlign: "center",
            background: "linear-gradient(to right, #a855f7, #d946ef)", // purple gradient
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Client Console
        </h1>

        {/* Input: Key */}
        <label style={{ fontSize: "13px", color: "#c084fc" }}>Key</label>
        <input
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="e.g. user:101"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "15px",
            background: "#1a1a1a",
            border: "1px solid #3b3b3b",
            borderRadius: "8px",
            color: "white",
            fontSize: "14px",
          }}
        />

        {/* Input: Value */}
        <label style={{ fontSize: "13px", color: "#c084fc" }}>
          Value (String or JSON)
        </label>
        <input
          value={valueInput}
          onChange={(e) => setValueInput(e.target.value)}
          placeholder={`{"role": "admin"}`}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "6px",
            marginBottom: "20px",
            background: "#1a1a1a",
            border: "1px solid #3b3b3b",
            borderRadius: "8px",
            color: "white",
            fontSize: "14px",
          }}
        />

        {/* PUT button */}
        <button
          onClick={handlePut}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(to right, #34d399, #10b981)", // GREEN ONLY
            color: "#0d0d0d",
            fontWeight: "600",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
            transition: "0.2s",
          }}
          onMouseOver={(e) => (e.target.style.opacity = "0.85")}
          onMouseOut={(e) => (e.target.style.opacity = "1")}
        >
          PUT Item
        </button>

        {/* Status box */}
        <pre
          style={{
            marginTop: "20px",
            background: "#1a1a1a",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(168, 85, 247, 0.3)", // purple border
            fontSize: "13px",
            color: "#e9d5ff",
            minHeight: "45px",
          }}
        >
          {status}
        </pre>
      </div>
    </div>
  );
}
