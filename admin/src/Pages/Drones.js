// src/Pages/Drones.jsx (updated - Fix toggle Switch để luôn chuyển đúng từ false sang true, và cải thiện logic onChange)
import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Spin, Alert, Modal, Form, Input, Select, Button, message, Popconfirm, Space, Switch } from 'antd';
import axios from 'axios';

const { Option } = Select;
const API_BASE = process.env.REACT_APP_SERVER_URL;

export default function Drones() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingDrone, setEditingDrone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDrones = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(`${API_BASE}/drone/getAll`);
      const rawDrones = data.drones || [];
      const formattedDrones = rawDrones.map(d => ({
        key: d.droneId,
        droneId: d.droneId,
        model: d.model || 'N/A',
        status: d.status,
        lat: d.homeBase.lat,
        lng: d.homeBase.lng,
        formattedLocation: `${d.homeBase.lat.toFixed(4)}, ${d.homeBase.lng.toFixed(4)}`,
        isActive: d.isActive,
      }));
      console.log('Fetched drones:', formattedDrones); // Debug: Kiểm tra data
      setDrones(formattedDrones);
    } catch (err) {
      setError('Không thể tải danh sách drone');
      console.error('Fetch error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrones();
  }, []);

  // useMemo cho filteredDrones: Hiển thị tất cả drone (active + inactive), với search
  const filteredDrones = useMemo(() => {
    console.log('Computing filteredDrones - searchTerm:', searchTerm, 'total drones:', drones.length); // Debug
    let filtered = [...drones]; // Hiển thị tất cả
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.droneId.toLowerCase().includes(lowerSearch) ||
        d.model.toLowerCase().includes(lowerSearch) ||
        d.status.toLowerCase().includes(lowerSearch) ||
        d.formattedLocation.toLowerCase().includes(lowerSearch)
      );
    }
    console.log('After filter - length:', filtered.length); // Debug
    return filtered;
  }, [drones, searchTerm]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  // Toggle isActive inline từ table - Sử dụng 'targetChecked' (giá trị mới sau click) để quyết định action
  const handleToggleActive = async (droneId, currentActive, targetChecked) => {
    console.log('Toggle attempt - droneId:', droneId, 'current:', currentActive, 'target:', targetChecked); // Debug
    try {
      if (targetChecked) {
        // Chuyển sang true: Kích hoạt
        await axios.patch(`${API_BASE}/drone/${droneId}/activate`);
        message.success('Drone đã được kích hoạt');
      } else {
        // Chuyển sang false: Vô hiệu hóa
        await axios.patch(`${API_BASE}/drone/${droneId}/deactivate`);
        message.success('Drone đã được vô hiệu hóa');
      }
      fetchDrones(); // Refresh
    } catch (err) {
      console.error('Toggle active error:', err.response?.data || err.message);
      message.error('Không thể thay đổi trạng thái: ' + (err.response?.data?.message || err.message));
      // Rollback UI tạm thời nếu lỗi (optional)
      fetchDrones();
    }
  };

  const handleAdd = () => {
    setEditingDrone(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingDrone(record);
    form.setFieldsValue({
      droneId: record.droneId,
      model: record.model,
      status: record.status,
      lat: record.lat,
      lng: record.lng,
    });
    setIsModalVisible(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let payload;

      if (editingDrone) {
        payload = {};
        if (values.model !== editingDrone.model) payload.model = values.model;
        if (values.status !== editingDrone.status) payload.status = values.status;
        if (values.lat !== editingDrone.lat || values.lng !== editingDrone.lng) {
          const lat = parseFloat(values.lat);
          const lng = parseFloat(values.lng);
          if (!isNaN(lat) && !isNaN(lng)) {
            payload.homeBase = { lat, lng };
          } else {
            throw new Error('Vĩ độ hoặc kinh độ không hợp lệ');
          }
        }
        if (Object.keys(payload).length === 0) {
          message.info('Không có thay đổi nào');
          setIsModalVisible(false);
          return;
        }
        await axios.patch(`${API_BASE}/drone/${editingDrone.droneId}`, payload);
        message.success('Cập nhật drone thành công');
      } else {
        const lat = parseFloat(values.lat);
        const lng = parseFloat(values.lng);
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Vĩ độ hoặc kinh độ không hợp lệ');
        }
        payload = {
          droneId: values.droneId,
          model: values.model,
          status: values.status,
          homeBase: { lat, lng },
        };
        await axios.post(`${API_BASE}/drone/AddDrone`, payload);
        message.success('Thêm drone thành công');
      }
      setIsModalVisible(false);
      fetchDrones();
    } catch (err) {
      console.error('Update/Create error:', err.response?.data || err.message);
      message.error('Lỗi: ' + (err.response?.data?.message || err.message || 'Dữ liệu không hợp lệ'));
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingDrone(null);
  };

  const columns = [
    { title: 'ID Drone', dataIndex: 'droneId', key: 'droneId' },
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status) => <span>{status === 'IDLE' ? 'IDLE' : 'BUSY'}</span> },
    { title: 'Vị trí Home Base', dataIndex: 'formattedLocation', key: 'formattedLocation', ellipsis: true },
    {
      title: 'Trạng thái hoạt động',
      key: 'isActive',
      render: (_, record) => (
        <Switch
          checked={record.isActive}
          onChange={(targetChecked) => handleToggleActive(record.droneId, record.isActive, targetChecked)} // Sử dụng targetChecked (giá trị mới)
          checkedChildren="Hoạt động"
          unCheckedChildren="Không hoạt động"
          loading={loading}
        />
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  if (loading) return <Spin tip="Đang tải..." style={{ margin: '50px auto', display: 'block' }} />;
  if (error) return <Alert message="Lỗi" description={error} type="error" showIcon style={{ margin: 24 }} />;

  return (
    <>
      <Card
        title="Quản lý Drone"
        extra={
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input.Search
              placeholder="Tìm kiếm theo ID, model, trạng thái hoặc vị trí"
              onSearch={handleSearch}
              style={{ width: 300 }}
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button type="primary" onClick={handleAdd}>
              Thêm Drone
            </Button>
          </div>
        }
      >
        <Table
          dataSource={filteredDrones}
          columns={columns}
          rowKey="droneId"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingDrone ? 'Sửa Drone' : 'Thêm Drone'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="droneId" label="ID Drone" rules={[{ required: true, message: 'Vui lòng nhập ID Drone!' }]}>
            <Input placeholder="VD: DRN-001" disabled={!!editingDrone} />
          </Form.Item>
          <Form.Item name="model" label="Model" rules={[{ required: true, message: 'Vui lòng nhập model!' }]}>
            <Input placeholder="VD: DJI Phantom 4" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}>
            <Select placeholder="Chọn trạng thái">
              <Option value="IDLE">IDLE (Rảnh)</Option>
              <Option value="BUSY">BUSY (Bận)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="lat" label="Vĩ độ (Lat)" rules={[{ required: true, message: 'Vui lòng nhập vĩ độ!' }]}>
            <Input type="number" step="any" placeholder="VD: 10.7769" />
          </Form.Item>
          <Form.Item name="lng" label="Kinh độ (Lng)" rules={[{ required: true, message: 'Vui lòng nhập kinh độ!' }]}>
            <Input type="number" step="any" placeholder="VD: 106.7009" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}