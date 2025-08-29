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
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Orders = ({ autoOpenModal = false, onModalClose }) => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filters, setFilters] = useState({});

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [partModels, setPartModels] = useState([]);
  const [itemForm] = Form.useForm();
  const [itemLoading, setItemLoading] = useState(false);

  const suppliers = [
    { id: 1, name: '戴尔官方授权店', contact: '张经理', phone: '021-12345678' },
    { id: 2, name: 'H3C网络设备专卖', contact: '李经理', phone: '010-87654321' },
    { id: 3, name: '金士顿存储设备店', contact: '王经理', phone: '020-11223344' },
  ];

  useEffect(() => {
    fetchOrders(pagination.current, pagination.pageSize, filters);
    loadPartModels();
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

  const fetchOrders = async (page, pageSize, f) => {
    try {
      if (!ipcRenderer) return;
      setLoading(true);
      const payloadFilters = { ...f };
      if (payloadFilters.dateRange && payloadFilters.dateRange.length === 2) {
        payloadFilters.dateRange = [
          dayjs(payloadFilters.dateRange[0]).format('YYYY-MM-DD'),
          dayjs(payloadFilters.dateRange[1]).format('YYYY-MM-DD')
        ];
      }
      const res = await ipcRenderer.invoke('orders:listPaged', { page, pageSize, filters: payloadFilters });
      setOrders(res.rows || []);
      setTotal(res.total || 0);
      setPagination({ current: page, pageSize });
    } catch (e) {
      console.error('加载订单失败:', e);
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentPage = () => fetchOrders(pagination.current, pagination.pageSize, filters);

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

  const handleView = async (record) => {
    setSelectedOrder({ ...record, items: [] });
    setIsDetailModalVisible(true);
    try {
      const items = await ipcRenderer.invoke('order_items:listByOrder', record.id);
      setSelectedOrder(prev => ({ ...prev, items: items || [] }));
      itemForm.resetFields();
    } catch (e) {
      console.error('加载订单明细失败:', e);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个订单吗？',
      onOk: async () => {
        try {
          await ipcRenderer.invoke('orders:delete', id);
          reloadCurrentPage();
          message.success('删除成功');
        } catch (e) {
          message.error('删除失败');
        }
      }
    });
  };

  const genOrderNumber = () => {
    const y = new Date().getFullYear();
    const s = String(Date.now()).slice(-6);
    return `PO-${y}-${s}`;
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const orderData = {
        order_number: editingOrder?.order_number || genOrderNumber(),
        supplier: values.supplier,
        order_date: values.order_date.format('YYYY-MM-DD'),
        status: editingOrder?.status || 'pending',
        notes: values.notes || '',
        total_amount: editingOrder?.total_amount || 0
      };

      if (editingOrder) {
        await ipcRenderer.invoke('orders:update', { id: editingOrder.id, updates: orderData });
        message.success('更新成功');
      } else {
        await ipcRenderer.invoke('orders:create', orderData);
        message.success('订单创建成功');
      }

      setIsModalVisible(false);
      form.resetFields();
      onModalClose && onModalClose();
      reloadCurrentPage();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const addOrderItem = async () => {
    if (!selectedOrder) return;
    try {
      const values = await itemForm.validateFields();
      setItemLoading(true);
      const item = {
        part_model: values.part_model,
        quantity: values.quantity,
        unit_price: values.unit_price,
        total_price: values.quantity * values.unit_price
      };
      const res = await ipcRenderer.invoke('order_items:add', { order_id: selectedOrder.id, item });
      if (res?.ok) {
        await reloadSelectedOrderItems(selectedOrder.id);
        itemForm.resetFields();
        message.success('已添加明细');
      } else {
        message.error(res?.error || '添加失败');
      }
    } catch (e) {
    } finally {
      setItemLoading(false);
    }
  };

  const deleteOrderItem = async (itemId) => {
    if (!selectedOrder) return;
    try {
      await ipcRenderer.invoke('order_items:delete', { order_id: selectedOrder.id, item_id: itemId });
      await reloadSelectedOrderItems(selectedOrder.id);
      message.success('已删除明细');
    } catch (e) {
      message.error('删除失败');
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
    { title: '订单号', dataIndex: 'order_number', key: 'order_number' },
    { title: '订单日期', dataIndex: 'order_date', key: 'order_date' },
    { title: '供应商', dataIndex: 'supplier', key: 'supplier' },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', render: (amount) => `¥${Number(amount).toFixed(2)}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status) => getStatusTag(status) },
    { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (notes) => (<Tooltip title={notes}><span>{notes}</span></Tooltip>) },
    {
      title: '操作', key: 'action', width: 160, align: 'center',
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button type="link" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}>删除</Button>
        </span>
      )
    }
  ];

  const itemColumns = [
    { title: '配件型号', dataIndex: 'part_model', key: 'part_model' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (price) => `¥${Number(price).toFixed(2)}` },
    { title: '小计', dataIndex: 'total_price', key: 'total_price', render: (price) => `¥${Number(price).toFixed(2)}` },
    { title: '操作', key: 'item_action', width: 100, align: 'center', render: (_, record) => (<Button type="link" danger onClick={() => deleteOrderItem(record.id)}>删除</Button>) }
  ];

  // 筛选区域
  const [filterForm] = Form.useForm();
  const onFilter = () => {
    const v = filterForm.getFieldsValue();
    const f = {
      orderNumber: v.orderNumber,
      supplier: v.supplier,
      status: v.status,
      dateRange: v.dateRange
    };
    setFilters(f);
    fetchOrders(1, pagination.pageSize, f);
  };

  const handleExportExcel = async () => {
    if (!ipcRenderer) return message.error('无法访问 Electron IPC');
    const payloadFilters = { ...filters };
    if (payloadFilters.dateRange && payloadFilters.dateRange.length === 2) {
      payloadFilters.dateRange = [
        dayjs(payloadFilters.dateRange[0]).format('YYYY-MM-DD'),
        dayjs(payloadFilters.dateRange[1]).format('YYYY-MM-DD')
      ];
    }
    const res = await ipcRenderer.invoke('export:ordersExcel', { filters: payloadFilters });
    if (res?.ok) message.success(`已导出: ${res.filePath}`);
    else message.error(res?.error || '导出失败');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>订单管理</Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>导出 Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建订单</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <Form layout="inline" form={filterForm}>
          <Form.Item name="orderNumber">
            <Input placeholder="订单号" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="supplier">
            <Select placeholder="供应商" allowClear style={{ width: 180 }}>
              {suppliers.map(s => (<Option key={s.name} value={s.name}>{s.name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 150 }}>
              <Option value="pending">待处理</Option>
              <Option value="processing">处理中</Option>
              <Option value="completed">已完成</Option>
              <Option value="cancelled">已取消</Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onFilter} icon={<SearchOutlined />}>筛选</Button>
              <Button onClick={() => { filterForm.resetFields(); setFilters({}); fetchOrders(1, pagination.pageSize, {}); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={orders}
          rowKey="id"
          size="small"
          loading={loading}
          rowClassName={() => 'clickable-row'}
          onRow={(record) => ({ onClick: () => handleView(record) })}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, pageSize) => fetchOrders(page, pageSize, filters)
          }}
        />
      </Card>

      {/* 以下保持不变：订单表单与详情（含明细增删） */}
      {/* ... 已在上文定义 ... */}

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
          <Form.Item name="supplier" label="供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <Select placeholder="请选择供应商" allowClear>
              {suppliers.map(supplier => (<Option key={supplier.name} value={supplier.name}>{supplier.name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="order_date" label="订单日期" rules={[{ required: true, message: '请选择订单日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="订单详情" open={isDetailModalVisible} onCancel={() => setIsDetailModalVisible(false)} footer={null} width={900}>
        {selectedOrder && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><strong>订单号：</strong> {selectedOrder.order_number}</Col>
              <Col span={12}><strong>订单日期：</strong> {selectedOrder.order_date}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}><strong>供应商：</strong> {selectedOrder.supplier}</Col>
              <Col span={12}><strong>状态：</strong> {getStatusTag(selectedOrder.status)}</Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}><strong>备注：</strong> {selectedOrder.notes}</Col>
            </Row>

            <Title level={4}>订单明细</Title>
            <Table columns={itemColumns} dataSource={selectedOrder.items} pagination={false} size="small" />

            <Card size="small" style={{ marginTop: 16 }}>
              <Form layout="inline" form={itemForm}>
                <Form.Item name="part_model" rules={[{ required: true, message: '请选择配件型号' }]}>
                  <Select 
                    placeholder="配件型号" 
                    style={{ width: 260 }} 
                    allowClear
                    showSearch
                    filterOption={(input, option) => {
                      const label = String(option?.children || '');
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                    optionFilterProp="children"
                  >
                    {partModels.map(pm => (
                      <Option key={pm.model_code} value={pm.model_name}>
                        {pm.model_code} - {pm.model_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="quantity" rules={[{ required: true, message: '数量' }]}>
                  <InputNumber min={1} placeholder="数量" />
                </Form.Item>
                <Form.Item name="unit_price" rules={[{ required: true, message: '单价' }]}>
                  <InputNumber min={0} precision={2} placeholder="单价" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" loading={itemLoading} onClick={addOrderItem}>添加明细</Button>
                </Form.Item>
              </Form>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <strong>总金额：¥{Number(selectedOrder.total_amount).toFixed(2)}</strong>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders; 