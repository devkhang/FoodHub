import { Card, Col, Row, Statistic } from 'antd';
import { Line } from '@ant-design/charts';

const revenueData = [
  { day: '28/10', revenue: 1200000 },
  { day: '29/10', revenue: 1800000 },
  { day: '30/10', revenue: 1500000 },
  { day: '31/10', revenue: 2200000 },
  { day: '01/11', revenue: 2800000 },
  { day: '02/11', revenue: 3100000 },
  { day: '03/11', revenue: 2900000 },
];

const chartConfig = {
  data: revenueData,
  xField: 'day',
  yField: 'revenue',
  smooth: true,
  color: '#ff4d4f',
  height: 300,
};

export default function Dashboard() {
  return (
    <>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="Doanh thu hôm nay" value="2.900.000 ₫" valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Đơn drone" value={842} /></Card></Col>
        <Col span={6}><Card><Statistic title="Drone sẵn sàng" value={128} prefix="DR-" /></Card></Col>
        <Col span={6}><Card><Statistic title="Tỷ lệ giao" value={99.8} suffix="%" precision={1} /></Card></Col>
      </Row>
      <Card title="Doanh thu 7 ngày" style={{ marginTop: 24 }}>
        <Line {...chartConfig} />
      </Card>
    </>
  );
}