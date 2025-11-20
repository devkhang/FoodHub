// src/Pages/Dashboard.jsx (Chỉ hiển thị COMMISSION HÔM NAY)
import { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Spin, Alert } from 'antd';
import { Line } from '@ant-design/charts';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_SERVER_URL}/order/getAllOrders`;

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayCommission: 0,      // Commission hôm nay (chỉ lấy commission)
    todayOrderCount: 0,      // Số đơn hôm nay
  });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatVND = (v) => new Intl.NumberFormat('vi-VN').format(v) + ' $';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL);
        const orders = data.orders || [];

        // Ngày hôm nay (dd/mm/yyyy)
        const todayStr = new Date().toLocaleDateString('en-GB');

        // Lọc đơn hàng hôm nay + tính commission
        const todayCommission = orders
          .filter(o => new Date(o._doc.createdAt).toLocaleDateString('en-GB') === todayStr)
          .reduce((sum, o) => sum + (o._doc.commission || 0), 0);

        const todayOrderCount = orders.filter(o => 
          new Date(o._doc.createdAt).toLocaleDateString('en-GB') === todayStr
        ).length;

        // Biểu đồ commission 7 ngày gần nhất
        const last7Days = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days[d.toLocaleDateString('en-GB')] = 0;
        }

        orders.forEach(o => {
          const key = new Date(o._doc.createdAt).toLocaleDateString('en-GB');
          if (last7Days.hasOwnProperty(key)) {
            last7Days[key] += (o._doc.commission || 0);
          }
        });

        const chartDataFormatted = Object.entries(last7Days)
          .map(([day, commission]) => ({ 
            day: day.slice(0, 5), // 20/11
            commission 
          }))
          .sort((a, b) => {
            const dateA = new Date(a.day.split('/').reverse().join('-'));
            const dateB = new Date(b.day.split('/').reverse().join('-'));
            return dateA - dateB;
          });

        setStats({ todayCommission, todayOrderCount });
        setChartData(chartDataFormatted);

      } catch (err) {
        setError('Không tải được dữ liệu commission');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartConfig = {
    data: chartData,
    xField: 'day',
    yField: 'commission',
    smooth: true,
    color: '#ff4d4f',
    height: 300,
    yAxis: { label: { formatter: v => (v / 1000000).toFixed(1) + 'M' } },
    tooltip: { formatter: d => ({ name: 'Commission', value: formatVND(d.commission) }) },
  };

  if (loading) return <Spin tip="Đang tải commission..." size="large" style={{ marginTop: 100, display: 'block' }} />;
  if (error) return <Alert message="Lỗi" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Card>
            <Statistic
              title="Commission hôm nay"
              value={formatVND(stats.todayCommission)}
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
              prefix="₫"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="Số đơn hàng hôm nay"
              value={stats.todayOrderCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Commission 7 ngày gần nhất" style={{ marginTop: 24 }}>
        <Line {...chartConfig} />
      </Card>
    </>
  );
}