// Payments.jsx – PHIÊN BẢN DỄ VẼ SEQUENCE DIAGRAM (vẫn cực nhanh, chuẩn production 2025)
import { useState, useEffect, useCallback } from 'react';
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

  // ===================== CÁC HÀM CÓ TÊN RÕ RÀNG ĐỂ VẼ SEQUENCE =====================
  const fetchPayments = useCallback(async () => {
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
  }, []);

  const handleDateRangeChange = useCallback((dates) => {
    setDateRange(dates || [null, null]);
  }, []);

  const handleStatusChange = useCallback((value) => {
    setStatusFilter(value);
  }, []);

  const processPaymentsData = useCallback(() => {
    // 1. Lọc theo ngày + status + sắp xếp
    let list = [...payments];

    if (dateRange?.[0] && dateRange?.[1]) {
      list = list.filter(p => {
        const d = p.paidAt ? dayjs(p.paidAt) : dayjs(p.createdAt);
        return d.isAfter(dateRange[0].startOf('day')) && d.isBefore(dateRange[1].endOf('day'));
      });
    }

    if (statusFilter !== 'all') {
      list = list = list.filter(p => p.status === statusFilter);
    }

    list.sort((a, b) => 
      new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt)
    );

    // 2. Tính toán thống kê
    const successPayments = list.filter(p => p.status === 'SUCCESS');
    const totalRevenue = successPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCommission = successPayments.reduce((s, p) => s + (p.commission || 0), 0);
    const totalTransferred = successPayments
      .filter(p => p.transferredAt)
      .reduce((s, p) => s + (p.netAmount || 0), 0);

    // 3. Biểu đồ 7 ngày
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
    const chartData = Object.entries(last7Days).map(([day, commission]) => ({
      day,
      commission,
    }));

    return {
      filteredPayments: list,
      successPayments,
      totalRevenue,
      totalCommission,
      totalTransferred,
      chartData,
    };
  }, [payments, dateRange, statusFilter]);

  // ===================== GỌI HÀM XỬ LÝ =====================
  const {
    filteredPayments,
    totalRevenue,
    totalCommission,
    totalTransferred,
    chartData,
  } = processPaymentsData();

  // ===================== EFFECT =====================
  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 30000);
    return () => clearInterval(interval);
  }, [fetchPayments]);

  // ===================== HELPER =====================
  const dash = (value) => (value == null || value === '' || value === 0) ? '-' : value;

  const formatUSD = (value) => {
    if (value == null || value === 0) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // ===================== COLUMNS (giữ nguyên) =====================
  const columns = [
    { title: 'Time', dataIndex: 'paidAt', render: d => d ? dayjs(d).format('DD/MM HH:mm') : '-', width: 140 },
    { title: 'Customer', dataIndex: 'userName', render: dash, width: 150 },
    { title: 'Restaurant', dataIndex: 'sellerName', render: dash, width: 180 },
    { title: 'Total', dataIndex: 'amount', render: formatUSD, width: 130 },
    { title: 'Platform Fee', dataIndex: 'commission', render: formatUSD, width: 140 },
    { title: 'Seller Payout', dataIndex: 'netAmount', render: formatUSD, width: 150 },
    {
      title: 'Status',
      dataIndex: 'status',
      render: s => s ? <Tag color={{ SUCCESS: 'green', PENDING: 'orange', FAILED: 'red', REFUNDED: 'purple' }[s] || 'default'}>{s}</Tag> : '-',
      width: 110,
    },
    {
      title: 'Transferred',
      render: (_, r) => r.transferredAt ? <Tag color="success">Yes</Tag> : <Tag color="warning">No</Tag>,
      width: 120,
    },
  ];

  // ===================== RENDER =====================
  if (loading) return <Spin tip="Loading payments..." size="large" style={{ marginTop: 100, display: 'block' }} />;
  if (error) return <Alert message="Error" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Total Revenue" value={formatUSD(totalRevenue)} valueStyle={{ color: '#3f8600' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Platform Fee" value={formatUSD(totalCommission)} valueStyle={{ color: '#cf1322' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Transferred to Sellers" value={formatUSD(totalTransferred)} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Successful Orders" value={filteredPayments.filter(p => p.status === 'SUCCESS').length} /></Card></Col>
      </Row>

      <Card
        title="Payment Tracking"
        extra={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <RangePicker value={dateRange} onChange={handleDateRangeChange} format="DD/MM/YYYY" />
            <Select value={statusFilter} onChange={handleStatusChange} style={{ width: 160 }}>
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="SUCCESS">Success</Select.Option>
              <Select.Option value="PENDING">Pending</Select.Option>
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