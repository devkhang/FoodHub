// src/Pages/Sellers.jsx
import { useState, useEffect } from 'react';
import { Card, Table, Spin, Alert } from 'antd';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_SERVER_URL}/seller/getAllInfo`;

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSellers = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await axios.get(API_URL);
        const rawSellers = data.sellers || [];

        const formattedSellers = rawSellers.map(s => ({
          name: s.name,
          email: s.email,
          formattedAddress: s.formattedAddress,
          key: s.email,
        }));

        setSellers(formattedSellers);
      } catch (err) {
        setError('Không thể tải danh sách quán ăn');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const columns = [
    { title: 'Tên quán', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Địa chỉ',
      dataIndex: 'formattedAddress',
      key: 'formattedAddress',
      ellipsis: true,
    },
  ];

  if (loading) return <Spin tip="Đang tải..." style={{ margin: '50px auto', display: 'block' }} />;
  if (error) return <Alert message="Lỗi" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <Card title="Danh sách quán ăn">
      <Table
        dataSource={sellers}
        columns={columns}
        rowKey="email"
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}