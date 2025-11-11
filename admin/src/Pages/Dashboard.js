// src/Pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Spin, Alert } from 'antd';
import { Line } from '@ant-design/charts';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_SERVER_URL}/order/getAllOrders`;

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    totalOrders: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatVND = (v) => new Intl.NumberFormat('vi-VN').format(v) + ' ₫';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data } = await axios.get(API_URL);
        const orders = data.orders || [];
        // 1. Doanh thu hôm nay
        const today = new Date().toLocaleDateString('en-GB'); // dd/mm/yyyy
        const todayRevenue = orders
          .filter(o => new Date(o._doc.createdAt).toLocaleDateString('en-GB') === today)
          .reduce((sum, o) => sum + o.totalItemMoney, 0);
        // 2. Doanh thu 7 ngày
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days[d.toLocaleDateString('en-GB')] = 0;
        }

        orders.forEach(o => {
          const key = new Date(o._doc.createdAt).toLocaleDateString('en-GB');
          if (last7Days.hasOwnProperty(key)) {
            last7Days[key] += o.totalItemMoney;
          }
        });

        const chartData = Object.entries(last7Days)
          .map(([day, revenue]) => ({ day: day.slice(0, 5), revenue }))
          .sort((a, b) => new Date(a.day.split('/').reverse().join('-')) - new Date(b.day.split('/').reverse().join('-')));

        setStats(s => ({ ...s, todayRevenue, totalOrders: orders.length }));
        setChartData(chartData);

      } catch (err) {
        setError('Không thể tải dữ liệu. Kiểm tra backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  const chartConfig = {
    data: chartData,
    xField: 'day',
    yField: 'revenue',
    smooth: true,
    color: '#ff4d4f',
    height: 300,
    yAxis: { label: { formatter: (v) => (v / 1000000).toFixed(1) + 'M' } },
    tooltip: { formatter: (d) => ({ name: 'Doanh thu', value: formatVND(d.revenue) }) },
    slider: {
      start: 0,
      end: 1,
      trendCfg: { isArea: false },
      height: 30,
      minLimit: 1, // tối thiểu 1 ngày
    }
  };

  if (loading) return <Spin tip="Đang tải..." size="large" style={{ marginTop: 50, display: 'block' }} />;
  if (error) return <Alert message="Lỗi" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <>
      <Row gutter={16}>
        <Col span={12}><Card><Statistic title="số tiền giao dịch trong hôm nay" value={formatVND(stats.todayRevenue)} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={12}><Card><Statistic title="Tổng đơn hàng" value={stats.totalOrders} /></Card></Col>
      </Row>

      <Card title="Doanh thu 7 ngày" style={{ marginTop: 24 }}>
        <Line {...chartConfig} />
      </Card>
    </>
  );
}