// src/Pages/Sellers.jsx (updated)
import { useState, useEffect } from "react";
import { Card, Table, Spin, Alert, Input, Switch } from "antd";
import axios from "axios";

const { Search } = Input;
const API_URL = `${process.env.REACT_APP_SERVER_URL}/seller/getAllInfo`;

export default function Sellers() {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSellers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await axios.get(API_URL);
      const rawSellers = data.sellers || [];

      const formattedSellers = rawSellers.map((s) => ({
        name: s.name,
        email: s.email,
        formattedAddress: s.formattedAddress,
        key: s.email,
        isActive: s.isActive,
        _id: s._id,
      }));

      setSellers(formattedSellers);
      setFilteredSellers(formattedSellers);
    } catch (err) {
      setError("Không thể tải danh sách quán ăn");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (!value) {
      setFilteredSellers(sellers);
      return;
    }
    const filtered = sellers.filter(
      (s) =>
        s.name.toLowerCase().includes(value.toLowerCase()) ||
        s.email.toLowerCase().includes(value.toLowerCase()) ||
        s.formattedAddress.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredSellers(filtered);
  };

  const handleToggleActive = async (email, isActive, targetChecked, _id) => {
    try {
      if (isActive !== targetChecked) {
        if (!targetChecked) {
          //check if seller has any order
          let response = await axios.get(
            `${process.env.REACT_APP_SERVER_URL}/seller/has-order`,
            {
              params: {
                sellerId: _id,
              },
            }
          );
          if (response.status !== 200) return;
          //check if seller as non-complete order
          let response1 = await axios.get(
            `${process.env.REACT_APP_SERVER_URL}/seller/has-incompleted-order`,
            {
              params: {
                sellerId: _id,
              },
            }
          );
          if (response1.status !== 200) return;

          let isHasOrder = response.data.data;
          let isHasIncompletedOrder = response1.data.data;
          if (isHasIncompletedOrder) {
            alert("Seller can't be deactivated, cause incompleted order");
            return;
          }
          if (isHasOrder) {
            await axios.patch(
              `${process.env.REACT_APP_SERVER_URL}/seller/status`,
              {
                status: "inactive",
                email: email,
              }
            );
          } else {
            await axios.delete(
              `${process.env.REACT_APP_SERVER_URL}/seller/delete-seller-via-email/${email}`
            );
          }
        } else {
          await axios.patch(
            `${process.env.REACT_APP_SERVER_URL}/seller/status`,
            {
              status: "active",
              email: email,
            }
          );
        }
        fetchSellers();
      }
    } catch (error) {
      //[not done: nothing for now]
      console.log(error.message);
    }
  };

  const columns = [
    { title: "Tên quán", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Địa chỉ",
      dataIndex: "formattedAddress",
      key: "formattedAddress",
      ellipsis: true,
    },
    {
      title: "Xóa",
      key: "status",
      render: (_, record) => (
        <Switch
          checked={record.isActive}
          onChange={(targetChecked) =>
            handleToggleActive(
              record.email,
              record.isActive,
              targetChecked,
              record._id
            )
          } // Sử dụng targetChecked (giá trị mới)
          checkedChildren="Hoạt động"
          unCheckedChildren="Không hoạt động"
          loading={loading}
        />
      ),
    },
  ];

  if (loading)
    return (
      <Spin
        tip="Đang tải..."
        style={{ margin: "50px auto", display: "block" }}
      />
    );
  if (error)
    return (
      <Alert
        message="Lỗi"
        description={error}
        type="error"
        showIcon
        style={{ margin: 24 }}
      />
    );

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
