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
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const StockIn = ({ autoOpenModal = false, onModalClose }) => {
  const [stockInRecords, setStockInRecords] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [partModels, setPartModels] = useState([]);

  // 模拟订单数据
  const orders = [
    { id: 1, order_number: 'PO-2024-001', supplier: '戴尔官方授权店' },
    { id: 2, order_number: 'PO-2024-002', supplier: 'H3C网络设备专卖' },
    { id: 3, order_number: 'PO-2024-003', supplier: '金士顿存储设备店' },
  ];

  useEffect(() => {
    loadStockInRecords();
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

  const STORAGE_KEY = 'invenmate_stock_in';

  const persist = async (records) => {
    try {
      if (ipcRenderer) {
        await ipcRenderer.invoke('appData:set', STORAGE_KEY, records);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch {}
  };

  const loadStockInRecords = async () => {
    try {
      if (ipcRenderer) {
        const data = await ipcRenderer.invoke('appData:get', STORAGE_KEY);
        if (data) { setStockInRecords(data); return; }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { setStockInRecords(JSON.parse(raw)); return; }
      }
    } catch {}
    // 首次默认示例数据
    const seed = [
      { id: 1, order_number: 'PO-2024-001', part_model: '戴尔 OptiPlex 7010', quantity: 5, unit_price: 3500.00, total_amount: 17500.00, stock_in_date: '2024-01-15', operator: '张三', notes: '办公电脑采购入库' },
      { id: 2, order_number: 'PO-2024-002', part_model: 'H3C S5120-28P-LI', quantity: 2, unit_price: 2800.00, total_amount: 5600.00, stock_in_date: '2024-01-14', operator: '李四', notes: '网络设备入库' }
    ];
    setStockInRecords(seed);
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
        setStockInRecords(prev => {
          const next = prev.filter(item => item.id !== id);
          persist(next);
          return next;
        });
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
        setStockInRecords(prev => {
          const next = prev.map(item => item.id === editingRecord.id ? { ...item, ...stockInData, id: item.id } : item);
          persist(next);
          return next;
        });
        message.success('更新成功');
      } else {
        // 新增记录
        const newRecord = {
          ...stockInData,
          id: Date.now(),
          operator: '当前用户'
        };
        setStockInRecords(prev => {
          const next = [newRecord, ...prev];
          persist(next);
          return next;
        });
        message.success('入库成功');
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
      width: 160,
      align: 'center',
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 8, whiteSpace: 'nowrap' }}>
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
        </span>
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
          size="small"
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