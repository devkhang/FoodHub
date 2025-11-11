// src/components/OnboardingRefresh.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';  // ← FIX 1: Đổi useNavigate thành useHistory
import axios from 'axios';

const OnboardingRefresh = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accountId = urlParams.get('accountId');// Lấy :accountId từ URL
  const history = useHistory();  // ← FIX 2: Đổi tên biến thành history (dễ nhớ)
  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'redirecting'

  // Dùng CRA → process.env.REACT_APP_...
  const BACKEND_URL = process.env.REACT_APP_SERVER_URL;

  useEffect(() => {
    // Kiểm tra accountId
    console.log("accountId: ",accountId);
    if (!accountId) {
      setStatus('error');
      return;
    }

    // Kiểm tra BACKEND_URL
    if (!BACKEND_URL) {
      console.error('REACT_APP_BACKEND_URL chưa được định nghĩa trong .env');
      setStatus('error');
      return;
    }

    const refreshOnboarding = async () => {
      try {
        setStatus('loading');
        const res = await axios.get(
          `${BACKEND_URL}/auth/onboarding/refresh/${accountId}`
        );

        const { url } = res.data;
        console.log("url : ",url)

        if (url) {
          setStatus('redirecting');
          // Dùng window.location để redirect ra ngoài (Stripe)
          window.location.href = url;
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Lỗi khi refresh onboarding:', err.response?.data || err.message);
        setStatus('error');
      }
    };

    refreshOnboarding();
  }, [accountId, BACKEND_URL]);

  // ================== UI ==================
  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.spinner}></div>
        <p style={styles.text}>Đang tạo lại liên kết Stripe...</p>
        <p style={styles.subtext}>Vui lòng đợi một chút!</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={styles.container}>
        <h2 style={styles.errorTitle}>Oops! Có lỗi xảy ra</h2>
        <p style={styles.errorText}>
          Không thể tạo liên kết onboarding. Vui lòng thử lại sau.
        </p>
        <button onClick={() => history.push('/dashboard')} style={styles.btn}>  // ← FIX 3: Đổi navigate → history.push
          Về Trang Chủ
        </button>
      </div>
    );
  }

  // redirecting → không hiển thị gì
  return null;
};

// ================== STYLES ==================
const styles = {
  container: {
    textAlign: 'center',
    padding: '60px 20px',
    fontFamily: 'Arial, sans-serif',
    maxWidth: '500px',
    margin: '0 auto',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    border: '6px solid #f3f3f3',
    borderTop: '6px solid #3498db',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  text: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2c3e50',
    margin: '10px 0',
  },
  subtext: {
    fontSize: '14px',
    color: '#7f8c8d',
    marginTop: '5px',
  },
  errorTitle: {
    color: '#e74c3c',
    fontSize: '24px',
    marginBottom: '15px',
  },
  errorText: {
    color: '#34495e',
    fontSize: '16px',
    marginBottom: '25px',
    lineHeight: '1.5',
  },
  btn: {
    padding: '12px 30px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
};

// Thêm animation vào <head>
const styleSheet = document.createElement('style');
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  button:hover {
    background-color: #2980b9 !important;
  }
`;
document.head.appendChild(styleSheet);

export default OnboardingRefresh;