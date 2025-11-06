import { Card, Table } from 'antd';

const sellerData = [
  { name: 'Phở 24', email: 'pho24@gmail.com', status: 'Chờ duyệt' },
  { name: 'Bánh Mì PewPew', email: 'pewpew@gmail.com', status: 'Đã duyệt' },
];

export default function Sellers() {
  const columns = [
    { title: 'Tên quán', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (s) => (
        <span style={{ color: s === 'Chờ duyệt' ? '#fa8c16' : '#52c41a' }}>
          {s}
        </span>
      ),
    },
    {
      title: '',
      render: () => <a style={{ color: '#ff4d4f' }}>Duyệt ngay</a>,
    },
  ];

  return (
    <Card title="Quán ăn chờ duyệt">
      <Table dataSource={sellerData} columns={columns} rowKey="email" />
    </Card>
  );
}