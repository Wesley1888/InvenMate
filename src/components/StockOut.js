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
  Alert
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const StockOut = () => {
  const [stockOutRecords, setStockOutRecords] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);

  // 模拟配件数据
  const partModels = [
    { id: 1, model_code: 'BEAR-6205', model_name: '轴承 6205-2RS', specification: '25x52x15mm', unit: '个', current_stock: 85 },
    { id: 2, model_code: 'SEAL-25x32', model_name: '密封圈 25x32x4', specification: '25x32x4mm', unit: '个', current_stock: 142 },
    { id: 3, model_code: 'BOLT-M8x20', model_name: '螺栓 M8x20', specification: 'M8x20mm', unit: '个', current_stock: 188 },
    { id: 4, model_code: 'WASHER-8', model_name: '垫片 8mm', specification: '8mm', unit: '个', current_stock: 270 },
  ];

  // 模拟部门数据
  const departments = [
    { id: 1, name: '生产部', code: 'PROD' },
    { id: 2, name: '维修部', code: 'MAINT' },
    { id: 3, name: '质检部', code: 'QC' },
    { id: 4, name: '研发部', code: 'R&D' },
  ];

  useEffect(() => {
    loadStockOutRecords();
  }, []);

  const loadStockOutRecords = () => {
    // 模拟数据
    setStockOutRecords([
      {
        id: 1,
        part_model: '轴承 6205-2RS',
        quantity: 15,
        unit_price: 15.50,
        total_amount: 232.50,
        recipient: '张三',
        department: '生产部',
        stock_out_date: '2024-01-15',
        operator: '李四',
        notes: '生产线维修使用'
      },
      {
        id: 2,
        part_model: '密封圈 25x32x4',
        quantity: 8,
        unit_price: 2.80,
        total_amount: 22.40,
        recipient: '王五',
        department: '维修部',
        stock_out_date: '2024-01-14',
        operator: '赵六',
        notes: '设备维护'
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
      stock_out_date: dayjs(record.stock_out_date)
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条出库记录吗？',
      onOk: () => {
        setStockOutRecords(prev => prev.filter(item => item.id !== id));
        message.success('删除成功');
      }
    });
  };

  const handlePartModelChange = (value) => {
    const selectedPart = partModels.find(part => part.model_name === value);
    if (selectedPart) {
      setCurrentStock(selectedPart.current_stock);
      form.setFieldsValue({ unit_price: selectedPart.unit_price || 0 });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 检查库存是否足够
      if (values.quantity > currentStock) {
        message.error(`库存不足！当前库存: ${currentStock}，出库数量: ${values.quantity}`);
        return;
      }

      setLoading(true);

      const stockOutData = {
        ...values,
        stock_out_date: values.stock_out_date.format('YYYY-MM-DD'),
        total_amount: values.quantity * values.unit_price
      };

      if (editingRecord) {
        // 更新记录
        setStockOutRecords(prev => 
          prev.map(item => 
            item.id === editingRecord.id 
              ? { ...item, ...stockOutData, id: item.id }
              : item
          )
        );
        message.success('更新成功');
      } else {
        // 新增记录
        const newRecord = {
          ...stockOutData,
          id: Date.now(),
          operator: '当前用户'
        };
        setStockOutRecords(prev => [newRecord, ...prev]);
        message.success('出库成功');
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
      title: '出库单号',
      dataIndex: 'id',
      key: 'id',
      render: (id) => `SO-${String(id).padStart(6, '0')}`
    },
    {
      title: '配件型号',
      dataIndex: 'part_model',
      key: 'part_model',
    },
    {
      title: '出库数量',
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
      title: '领用人',
      dataIndex: 'recipient',
      key: 'recipient',
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '出库日期',
      dataIndex: 'stock_out_date',
      key: 'stock_out_date',
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
        <Title level={2}>出库管理</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          新建出库
        </Button>
      </div>

      <Card>
        <Table 
          columns={columns} 
          dataSource={stockOutRecords}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑出库记录' : '新建出库'}
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
            stock_out_date: dayjs()
          }}
        >
          <Form.Item
            name="part_model"
            label="配件型号"
            rules={[{ required: true, message: '请选择配件型号' }]}
          >
            <Select 
              placeholder="请选择配件型号" 
              allowClear
              onChange={handlePartModelChange}
            >
              {partModels.map(part => (
                <Option key={part.model_code} value={part.model_name}>
                  {part.model_code} - {part.model_name} (库存: {part.current_stock})
                </Option>
              ))}
            </Select>
          </Form.Item>

          {currentStock > 0 && (
            <Alert
              message={`当前库存: ${currentStock} 个`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item
            name="quantity"
            label="出库数量"
            rules={[
              { required: true, message: '请输入出库数量' },
              { type: 'number', min: 1, message: '数量必须大于0' },
              {
                validator: (_, value) => {
                  if (value && value > currentStock) {
                    return Promise.reject(new Error(`库存不足，当前库存: ${currentStock}`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber 
              min={1} 
              max={currentStock}
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
            name="recipient"
            label="领用人"
            rules={[{ required: true, message: '请输入领用人姓名' }]}
          >
            <Input placeholder="请输入领用人姓名" />
          </Form.Item>

          <Form.Item
            name="department"
            label="部门"
            rules={[{ required: true, message: '请选择部门' }]}
          >
            <Select placeholder="请选择部门" allowClear>
              {departments.map(dept => (
                <Option key={dept.code} value={dept.name}>
                  {dept.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="stock_out_date"
            label="出库日期"
            rules={[{ required: true, message: '请选择出库日期' }]}
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

export default StockOut; 