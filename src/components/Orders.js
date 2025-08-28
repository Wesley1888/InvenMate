import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  DatePicker, 
  Select, 
  Space, 
  message,
  Typography,
  Tag,
  Tooltip,
  Row,
  Col
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Orders = ({ autoOpenModal = false, onModalClose }) => {
  const [orders, setOrders] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [partModels, setPartModels] = useState([]);

  // 模拟供应商数据
  const suppliers = [
    { id: 1, name: '戴尔官方授权店', contact: '张经理', phone: '021-12345678' },
    { id: 2, name: 'H3C网络设备专卖', contact: '李经理', phone: '010-87654321' },
    { id: 3, name: '金士顿存储设备店', contact: '王经理', phone: '020-11223344' },
  ];

  useEffect(() => {
    loadOrders();
    loadPartModels();
    
    // 监听配件型号数据变化
    const unsubscribe = partModelsService.addListener((models) => {
      setPartModels(models || []);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (autoOpenModal) {
      handleAdd();
    }
  }, [autoOpenModal]);

  const STORAGE_KEY = 'invenmate_orders';

  const persist = async (records) => {
    try {
      if (ipcRenderer) {
        await ipcRenderer.invoke('appData:set', STORAGE_KEY, records);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch {}
  };

  const loadOrders = async () => {
    try {
      if (ipcRenderer) {
        const data = await ipcRenderer.invoke('appData:get', STORAGE_KEY);
        if (data) { setOrders(data); return; }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { setOrders(JSON.parse(raw)); return; }
      }
    } catch {}
    const seed = [
      { id: 1, order_number: 'PO-2024-001', order_date: '2024-01-10', supplier: '戴尔官方授权店', total_amount: 17500.00, status: 'completed', notes: '办公电脑采购', items: [{ part_model: '戴尔 OptiPlex 7010', quantity: 5, unit_price: 3500.00, total_price: 17500.00 }] },
      { id: 2, order_number: 'PO-2024-002', order_date: '2024-01-12', supplier: 'H3C网络设备专卖', total_amount: 5600.00, status: 'pending', notes: '网络设备采购', items: [{ part_model: 'H3C S5120-28P-LI', quantity: 2, unit_price: 2800.00, total_price: 5600.00 }] }
    ];
    setOrders(seed);
    persist(seed);
  };

  const loadPartModels = async () => {
    try {
      const models = await partModelsService.getAll();
      setPartModels(models);
    } catch (error) {
      console.error('加载配件型号失败:', error);
    }
  };

  const handleAdd = () => {
    setEditingOrder(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingOrder(record);
    form.setFieldsValue({
      ...record,
      order_date: dayjs(record.order_date)
    });
    setIsModalVisible(true);
  };

  const handleView = (record) => {
    setSelectedOrder(record);
    setIsDetailModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个订单吗？',
      onOk: () => {
        setOrders(prev => { const next = prev.filter(i => i.id !== id); persist(next); return next; });
        message.success('删除成功');
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const orderData = {
        ...values,
        order_date: values.order_date.format('YYYY-MM-DD'),
        status: 'pending'
      };

      if (editingOrder) {
        // 更新订单
        setOrders(prev => { const next = prev.map(i => i.id === editingOrder.id ? { ...i, ...orderData, id: i.id } : i); persist(next); return next; });
        message.success('更新成功');
      } else {
        // 新增订单
        const newOrder = {
          ...orderData,
          id: Date.now(),
          order_number: `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
          total_amount: 0,
          items: []
        };
        setOrders(prev => { const next = [newOrder, ...prev]; persist(next); return next; });
        message.success('订单创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      onModalClose && onModalClose();
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'orange', text: '待处理' },
      processing: { color: 'blue', text: '处理中' },
      completed: { color: 'green', text: '已完成' },
      cancelled: { color: 'red', text: '已取消' }
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: '订单日期',
      dataIndex: 'order_date',
      key: 'order_date',
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `¥${amount.toFixed(2)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes) => (
        <Tooltip title={notes}>
          <span>{notes}</span>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
          >
            删除
          </Button>
        </span>
      ),
    },
  ];

  const itemColumns = [
    {
      title: '配件型号',
      dataIndex: 'part_model',
      key: 'part_model',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `¥${price.toFixed(2)}`
    },
    {
      title: '小计',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (price) => `¥${price.toFixed(2)}`
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>订单管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新建订单
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={orders}
          rowKey="id"
          size="small"
          rowClassName={() => 'clickable-row'}
          onRow={(record) => ({
            onClick: () => handleView(record)
          })}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
          }}
        />
      </Card>

      {/* 订单表单模态框 */}
      <Modal
        title={editingOrder ? '编辑订单' : '新建订单'}
        open={isModalVisible}
        onOk={handleSubmit}
                 onCancel={() => {
           setIsModalVisible(false);
           onModalClose && onModalClose();
         }}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            order_date: dayjs()
          }}
        >
          <Form.Item
            name="supplier"
            label="供应商"
            rules={[{ required: true, message: '请选择供应商' }]}
          >
            <Select placeholder="请选择供应商" allowClear>
              {suppliers.map(supplier => (
                <Option key={supplier.name} value={supplier.name}>
                  {supplier.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="order_date"
            label="订单日期"
            rules={[{ required: true, message: '请选择订单日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 订单详情模态框 */}
      <Modal
        title="订单详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedOrder && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>订单号：</strong> {selectedOrder.order_number}
              </Col>
              <Col span={12}>
                <strong>订单日期：</strong> {selectedOrder.order_date}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <strong>供应商：</strong> {selectedOrder.supplier}
              </Col>
              <Col span={12}>
                <strong>状态：</strong> {getStatusTag(selectedOrder.status)}
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <strong>备注：</strong> {selectedOrder.notes}
              </Col>
            </Row>
            
            <Title level={4}>订单明细</Title>
            <Table 
              columns={itemColumns} 
              dataSource={selectedOrder.items}
              pagination={false}
              size="small"
            />
            
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <strong>总金额：¥{selectedOrder.total_amount.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders; 