// src/Pages/Sellers.jsx (updated)
import { useState, useEffect } from 'react';
import { Card, Table, Spin, Alert, Input } from 'antd';
import axios from 'axios';

const { Search } = Input;
const API_URL = `${process.env.REACT_APP_SERVER_URL}/seller/getAllInfo`;

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
        setFilteredSellers(formattedSellers);
      } catch (err) {
        setError('Không thể tải danh sách quán ăn');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellers();
  }, []);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (!value) {
      setFilteredSellers(sellers);
      return;
    }
    const filtered = sellers.filter(s =>
      s.name.toLowerCase().includes(value.toLowerCase()) ||
      s.email.toLowerCase().includes(value.toLowerCase()) ||
      s.formattedAddress.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSellers(filtered);
  };

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
    <Card 
      title="Danh sách quán ăn"
      extra={
        <Search
          placeholder="Tìm kiếm theo tên, email hoặc địa chỉ"
          onSearch={handleSearch}
          enterButton
          style={{ width: 400 }}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />
      }
    >
      <Table
        dataSource={filteredSellers}
        columns={columns}
        rowKey="email"
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
}