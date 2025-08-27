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
  Tooltip
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const StockIn = () => {
  const [stockInRecords, setStockInRecords] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 模拟配件数据
  const partModels = [
    { id: 1, model_code: 'BEAR-6205', model_name: '轴承 6205-2RS', specification: '25x52x15mm', unit: '个' },
    { id: 2, model_code: 'SEAL-25x32', model_name: '密封圈 25x32x4', specification: '25x32x4mm', unit: '个' },
    { id: 3, model_code: 'BOLT-M8x20', model_name: '螺栓 M8x20', specification: 'M8x20mm', unit: '个' },
    { id: 4, model_code: 'WASHER-8', model_name: '垫片 8mm', specification: '8mm', unit: '个' },
  ];

  // 模拟订单数据
  const orders = [
    { id: 1, order_number: 'PO-2024-001', supplier: '上海轴承有限公司' },
    { id: 2, order_number: 'PO-2024-002', supplier: '北京密封件厂' },
    { id: 3, order_number: 'PO-2024-003', supplier: '广州紧固件公司' },
  ];

  useEffect(() => {
    loadStockInRecords();
  }, []);

  const loadStockInRecords = () => {
    // 模拟数据
    setStockInRecords([
      {
        id: 1,
        order_number: 'PO-2024-001',
        part_model: '轴承 6205-2RS',
        quantity: 100,
        unit_price: 15.50,
        total_amount: 1550.00,
        stock_in_date: '2024-01-15',
        operator: '张三',
        notes: '正常入库'
      },
      {
        id: 2,
        order_number: 'PO-2024-002',
        part_model: '密封圈 25x32x4',
        quantity: 200,
        unit_price: 2.80,
        total_amount: 560.00,
        stock_in_date: '2024-01-14',
        operator: '李四',
        notes: '质量检验通过'
      }
    ]);
  };

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      stock_in_date: dayjs(record.stock_in_date)
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条入库记录吗？',
      onOk: () => {
        setStockInRecords(prev => prev.filter(item => item.id !== id));
        message.success('删除成功');
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const stockInData = {
        ...values,
        stock_in_date: values.stock_in_date.format('YYYY-MM-DD'),
        total_amount: values.quantity * values.unit_price
      };

      if (editingRecord) {
        // 更新记录
        setStockInRecords(prev => 
          prev.map(item => 
            item.id === editingRecord.id 
              ? { ...item, ...stockInData, id: item.id }
              : item
          )
        );
        message.success('更新成功');
      } else {
        // 新增记录
        const newRecord = {
          ...stockInData,
          id: Date.now(),
          operator: '当前用户'
        };
        setStockInRecords(prev => [newRecord, ...prev]);
        message.success('入库成功');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '入库单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => `SI-${String(id).padStart(6, '0')}`
    },
    {
      title: '关联订单',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: '配件型号',
      dataIndex: 'part_model',
      key: 'part_model',
    },
    {
      title: '入库数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity, record) => `${quantity} ${record.unit || '个'}`
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `¥${price.toFixed(2)}`
    },
    {
      title: '总金额',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `¥${amount.toFixed(2)}`
    },
    {
      title: '入库日期',
      dataIndex: 'stock_in_date',
      key: 'stock_in_date',
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>入库管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新建入库
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={stockInRecords}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑入库记录' : '新建入库'}
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
            stock_in_date: dayjs()
          }}
        >
          <Form.Item
            name="order_number"
            label="关联订单"
            rules={[{ required: true, message: '请选择关联订单' }]}
          >
            <Select placeholder="请选择订单" allowClear>
              {orders.map(order => (
                <Option key={order.order_number} value={order.order_number}>
                  {order.order_number} - {order.supplier}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="part_model"
            label="配件型号"
            rules={[{ required: true, message: '请选择配件型号' }]}
          >
            <Select placeholder="请选择配件型号" allowClear>
              {partModels.map(part => (
                <Option key={part.model_code} value={part.model_name}>
                  {part.model_code} - {part.model_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="quantity"
            label="入库数量"
            rules={[{ required: true, message: '请输入入库数量' }]}
          >
            <InputNumber 
              min={1} 
              style={{ width: '100%' }} 
              placeholder="请输入数量"
            />
          </Form.Item>

          <Form.Item
            name="unit_price"
            label="单价"
            rules={[{ required: true, message: '请输入单价' }]}
          >
            <InputNumber 
              min={0} 
              precision={2}
              style={{ width: '100%' }} 
              placeholder="请输入单价"
              prefix="¥"
            />
          </Form.Item>

          <Form.Item
            name="stock_in_date"
            label="入库日期"
            rules={[{ required: true, message: '请选择入库日期' }]}
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
    </div>
  );
};

export default StockIn; 