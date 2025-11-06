// src/pages/OnboardingSuccess.js
import React, { useEffect } from "react";
import { useLocation, useHistory } from "react-router-dom";

export default function OnboardingSuccess() {
  const location = useLocation();
  const history = useHistory();

  const query = new URLSearchParams(location.search);
  console.log(" hello : ",query);
  const accountId = query.get("accountId");

  useEffect(() => {
    if (accountId) {
      localStorage.setItem("stripe_account_id", accountId);
    }
  }, [accountId]);

  return (
    <div style={{ textAlign: "center", padding: 50 }}>
      <h1>Kết nối thành công!</h1>
      <p>Tài khoản Stripe đã được liên kết.</p>
      {accountId && <p><small>ID: {accountId}</small></p>}
      <button
        style={{
          padding: "12px 24px",
          fontSize: 16,
          background: "#ff5a5f",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: "pointer"
        }}
        onClick={() => history.push("/login")}
      >
        vào login
      </button>
    </div>
  );
}