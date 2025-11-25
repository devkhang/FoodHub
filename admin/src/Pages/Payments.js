// src/Pages/Payments.jsx – KHÔNG DÙNG useMemo, ĐƠN GIẢN, NHANH, CHUẨN 100%
import { useState, useEffect } from 'react';
import { Card, Table, Spin, Alert, DatePicker, Select, Statistic, Row, Col, Tag } from 'antd';
import { Line } from '@ant-design/charts';
import axios from 'axios';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const API_BASE = process.env.REACT_APP_SERVER_URL;

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('week'), dayjs()]);
  const [statusFilter, setStatusFilter] = useState('all');

  // Hiển thị "-" nếu không có giá trị
  const dash = (value) => (value == null || value === '' || value === 0) ? '-' : value;

  // Format USD – nếu không có thì hiện "-"
  const formatUSD = (value) => {
    if (value == null || value === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/payment/getAll`);
      if (!data.success) throw new Error(data.message || 'Server error');
      setPayments(data.payments || []);
    } catch (err) {
      setError('Không thể tải danh sách thanh toán');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 30000);
    return () => clearInterval(interval);
  }, []);

  // === LỌC DỮ LIỆU (không dùng useMemo) ===
  let filteredPayments = [...payments];

  if (dateRange?.[0] && dateRange?.[1]) {
    filteredPayments = filteredPayments.filter(p => {
      const date = p.paidAt ? dayjs(p.paidAt) : dayjs(p.createdAt);
      return date.isAfter(dateRange[0].startOf('day')) && date.isBefore(dateRange[1].endOf('day'));
    });
  }

  if (statusFilter !== 'all') {
    filteredPayments = filteredPayments.filter(p => p.status === statusFilter);
  }

  filteredPayments.sort((a, b) =>
    new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt)
  );

  // === TÍNH TOÁN THỐNG KÊ (không dùng useMemo) ===
  const successPayments = filteredPayments.filter(p => p.status === 'SUCCESS');
  const totalRevenue = successPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCommission = successPayments.reduce((sum, p) => sum + (p.commission || 0), 0);
  const totalTransferred = successPayments
    .filter(p => p.transferredAt)
    .reduce((sum, p) => sum + (p.netAmount || 0), 0);

  // === BIỂU ĐỒ 7 NGÀY (không dùng useMemo) ===
  const last7Days = {};
  for (let i = 6; i >= 0; i--) {
    last7Days[dayjs().subtract(i, 'day').format('DD/MM')] = 0;
  }

  successPayments.forEach(p => {
    const day = dayjs(p.paidAt || p.createdAt).format('DD/MM');
    if (last7Days.hasOwnProperty(day)) {
      last7Days[day] += p.commission || 0;
    }
  });

  const chartData = Object.entries(last7Days).map(([day, commission]) => ({ day, commission }));

  const columns = [
    {
      title: 'Time',
      dataIndex: 'paidAt',
      render: d => d ? dayjs(d).format('DD/MM HH:mm') : '-',
      width: 140,
    },
    { title: 'Customer', dataIndex: 'userName', render: dash, width: 150 },
    { title: 'Restaurant', dataIndex: 'sellerName', render: dash, width: 180 },
    { title: 'Total', dataIndex: 'amount', render: formatUSD, width: 130 },
    { title: 'Platform Fee', dataIndex: 'commission', render: formatUSD, width: 140 },
    { title: 'Seller Payout', dataIndex: 'netAmount', render: formatUSD, width: 150 },
    {
      title: 'Status',
      dataIndex: 'status',
      render: s => s ? (
        <Tag color={{
          SUCCESS: 'green',
          PENDING: 'orange',
          FAILED: 'red',
          REFUNDED: 'purple'
        }[s] || 'default'}>{s}</Tag>
      ) : '-',
      width: 110,
    },
    {
      title: 'Transferred',
      render: (_, r) => r.transferredAt ? 
        <Tag color="success">Yes</Tag> : 
        <Tag color="warning">No</Tag>,
      width: 120,
    },
  ];

  if (loading) return <Spin tip="Loading payments..." size="large" style={{ marginTop: 100, display: 'block' }} />;
  if (error) return <Alert message="Error" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Total Revenue" value={formatUSD(totalRevenue)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Platform Fee" value={formatUSD(totalCommission)} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Transferred to Sellers" value={formatUSD(totalTransferred)} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Successful Orders" value={successPayments.length} /></Card></Col>
      </Row>

      <Card
        title="Payment Tracking"
        extra={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <RangePicker value={dateRange} onChange={setDateRange} format="DD/MM/YYYY" />
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}>
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="SUCCESS">Success</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
              <Select.Option value="FAILED">Failed</Select.Option>
              <Select.Option value="REFUNDED">Refunded</Select.Option>
            </Select>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredPayments}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1400 }}
          locale={{ emptyText: 'No payments found' }}
          summary={() => (
            <Table.Summary.Row style={{ fontWeight: 'bold', background: '#fafafa' }}>
              <Table.Summary.Cell colSpan={3}>TOTAL</Table.Summary.Cell>
              <Table.Summary.Cell>{formatUSD(totalRevenue)}</Table.Summary.Cell>
              <Table.Summary.Cell>{formatUSD(totalCommission)}</Table.Summary.Cell>
              <Table.Summary.Cell>{formatUSD(totalTransferred)}</Table.Summary.Cell>
              <Table.Summary.Cell colSpan={2} />
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Card title="Commission – Last 7 Days" style={{ marginTop: 24 }}>
        <Line
          data={chartData}
          xField="day"
          yField="commission"
          smooth
          color="#ff4d4f"
          height={300}
          tooltip={{ formatter: d => ({ name: 'Commission', value: formatUSD(d.commission) }) }}
        />
      </Card>
    </>
  );
}