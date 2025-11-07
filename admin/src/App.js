// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { DashboardOutlined, ShopOutlined, CarOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';

// Import các trang đã tách
import Dashboard from './Pages/Dashboard';
import Sellers from './Pages/Sellers';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/sellers', icon: <ShopOutlined />, label: 'Quán ăn' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={250} style={{ background: '#001529' }}>
        <div style={{ padding: 16, color: 'white', fontSize: 22, fontWeight: 'bold' }}>
          DroneEats Admin
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['/']}
          selectedKeys={[location.pathname === '/admin' ? '/' : location.pathname.replace('/admin', '')]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', fontSize: 20, fontWeight: 'bold', borderBottom: '1px solid #f0f0f0' }}>
          Quản trị hệ thống
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sellers" element={<Sellers />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default function App() {
  return (
    <Router basename="/admin">
      <Routes>
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </Router>
  );
}