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

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 模拟供应商数据
  const suppliers = [
    { id: 1, name: '上海轴承有限公司', contact: '张经理', phone: '021-12345678' },
    { id: 2, name: '北京密封件厂', contact: '李经理', phone: '010-87654321' },
    { id: 3, name: '广州紧固件公司', contact: '王经理', phone: '020-11223344' },
  ];

  // 模拟配件数据
  const partModels = [
    { id: 1, model_code: 'BEAR-6205', model_name: '轴承 6205-2RS', specification: '25x52x15mm', unit: '个' },
    { id: 2, model_code: 'SEAL-25x32', model_name: '密封圈 25x32x4', specification: '25x32x4mm', unit: '个' },
    { id: 3, model_code: 'BOLT-M8x20', model_name: '螺栓 M8x20', specification: 'M8x20mm', unit: '个' },
    { id: 4, model_code: 'WASHER-8', model_name: '垫片 8mm', specification: '8mm', unit: '个' },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = () => {
    // 模拟数据
    setOrders([
      {
        id: 1,
        order_number: 'PO-2024-001',
        order_date: '2024-01-10',
        supplier: '上海轴承有限公司',
        total_amount: 1550.00,
        status: 'completed',
        notes: '正常采购',
        items: [
          { part_model: '轴承 6205-2RS', quantity: 100, unit_price: 15.50, total_price: 1550.00 }
        ]
      },
      {
        id: 2,
        order_number: 'PO-2024-002',
        order_date: '2024-01-12',
        supplier: '北京密封件厂',
        total_amount: 560.00,
        status: 'pending',
        notes: '等待发货',
        items: [
          { part_model: '密封圈 25x32x4', quantity: 200, unit_price: 2.80, total_price: 560.00 }
        ]
      }
    ]);
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
        setOrders(prev => prev.filter(item => item.id !== id));
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
        setOrders(prev => 
          prev.map(item => 
            item.id === editingOrder.id 
              ? { ...item, ...orderData, id: item.id }
              : item
          )
        );
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
        setOrders(prev => [newOrder, ...prev]);
        message.success('订单创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
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
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
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
        onCancel={() => setIsModalVisible(false)}
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