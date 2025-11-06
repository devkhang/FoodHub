import React from 'react';
export default function OnboardingRefresh() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Có lỗi xảy ra</h1>
      <p>Link đã hết hạn. Vui lòng thử lại.</p>
      <button onClick={handleRetry}>Thử lại</button>
    </div>
  );
}