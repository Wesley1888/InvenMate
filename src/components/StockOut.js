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
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const StockOut = ({ autoOpenModal = false, onModalClose }) => {
  const [stockOutRecords, setStockOutRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [filters, setFilters] = useState({});

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);

  const [partModels, setPartModels] = useState([]);

  const departments = [
    { id: 1, name: 'IT部', code: 'IT' },
    { id: 2, name: '行政部', code: 'ADMIN' },
    { id: 3, name: '财务部', code: 'FINANCE' },
    { id: 4, name: '人事部', code: 'HR' },
  ];

  useEffect(() => {
    fetchStockOut(pagination.current, pagination.pageSize, filters);
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

  const fetchStockOut = async (page, pageSize, f) => {
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
      const res = await ipcRenderer.invoke('so:listPaged', { page, pageSize, filters: payloadFilters });
      setStockOutRecords(res.rows || []);
      setTotal(res.total || 0);
      setPagination({ current: page, pageSize });
    } catch (e) {
      console.error('加载出库记录失败:', e);
      message.error('加载出库记录失败');
    } finally {
      setLoading(false);
    }
  };

  const reloadCurrentPage = () => fetchStockOut(pagination.current, pagination.pageSize, filters);

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
      stock_out_date: dayjs(record.stock_out_date)
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条出库记录吗？',
      onOk: async () => {
        try {
          await ipcRenderer.invoke('so:delete', id);
          reloadCurrentPage();
          message.success('删除成功');
        } catch (e) {
          message.error('删除失败');
        }
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

      if (values.quantity <= 0) {
        message.error('数量必须大于0');
        return;
      }

      setLoading(true);

      const stockOutData = {
        ...values,
        stock_out_date: values.stock_out_date.format('YYYY-MM-DD'),
        total_amount: values.quantity * values.unit_price
      };

      if (editingRecord) {
        await ipcRenderer.invoke('so:update', { id: editingRecord.id, updates: stockOutData });
        message.success('更新成功');
      } else {
        await ipcRenderer.invoke('so:create', stockOutData);
        message.success('出库成功');
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

  const onFilter = () => {
    const v = filterForm.getFieldsValue();
    const f = {
      partModel: v.partModel,
      department: v.department,
      dateRange: v.dateRange
    };
    setFilters(f);
    fetchStockOut(1, pagination.pageSize, f);
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
    const res = await ipcRenderer.invoke('export:stockOutExcel', { filters: payloadFilters });
    if (res?.ok) message.success(`已导出: ${res.filePath}`);
    else message.error(res?.error || '导出失败');
  };

  const columns = [
    { title: '出库单号', dataIndex: 'id', key: 'id', render: (id) => `SO-${String(id).padStart(6, '0')}` },
    { title: '配件型号', dataIndex: 'part_model', key: 'part_model' },
    { title: '出库数量', dataIndex: 'quantity', key: 'quantity', render: (q, r) => `${q} ${r.unit || '个'}` },
    { title: '单价', dataIndex: 'unit_price', key: 'unit_price', render: (p) => `¥${Number(p).toFixed(2)}` },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', render: (a) => `¥${Number(a).toFixed(2)}` },
    { title: '领用人', dataIndex: 'recipient', key: 'recipient' },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '出库日期', dataIndex: 'stock_out_date', key: 'stock_out_date' },
    { title: '操作员', dataIndex: 'operator', key: 'operator' },
    { title: '备注', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (notes) => (<Tooltip title={notes}><span>{notes}</span></Tooltip>) },
    {
      title: '操作', key: 'action', width: 160, align: 'center',
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 8, whiteSpace: 'nowrap' }}>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </span>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>出库管理</Title>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>导出 Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建出库</Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <Form layout="inline" form={filterForm}>
          <Form.Item name="partModel">
            <Select placeholder="配件型号" allowClear style={{ width: 240 }}>
              {partModels.map(part => (<Option key={part.model_code} value={part.model_name}>{part.model_code} - {part.model_name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="department">
            <Select placeholder="部门" allowClear style={{ width: 180 }}>
              {departments.map(d => (<Option key={d.code} value={d.name}>{d.name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={onFilter} icon={<SearchOutlined />}>筛选</Button>
              <Button onClick={() => { filterForm.resetFields(); setFilters({}); fetchStockOut(1, pagination.pageSize, {}); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card>
        <Table 
          columns={columns} 
          dataSource={stockOutRecords}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, pageSize) => fetchStockOut(page, pageSize, filters)
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑出库记录' : '新建出库'}
        open={isModalVisible}
        onOk={handleSubmit}
                onCancel={() => {
          setIsModalVisible(false);
          onModalClose && onModalClose();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={form} layout="vertical" initialValues={{ stock_out_date: dayjs() }}>
          <Form.Item name="part_model" label="配件型号" rules={[{ required: true, message: '请选择配件型号' }]}>
            <Select placeholder="请选择配件型号" allowClear onChange={handlePartModelChange}>
              {partModels.map(part => (<Option key={part.model_code} value={part.model_name}>{part.model_code} - {part.model_name} {part.current_stock ? `(库存: ${part.current_stock})` : ''}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="quantity" label="出库数量" rules={[{ required: true, message: '请输入出库数量' }, { type: 'number', min: 1, message: '数量必须大于0' }]}>
            <InputNumber min={1} max={currentStock || undefined} style={{ width: '100%' }} placeholder="请输入数量" />
          </Form.Item>
          <Form.Item name="unit_price" label="单价" rules={[{ required: true, message: '请输入单价' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入单价" prefix="¥" />
          </Form.Item>
          <Form.Item name="recipient" label="领用人" rules={[{ required: true, message: '请输入领用人姓名' }]}>
            <Input placeholder="请输入领用人姓名" />
          </Form.Item>
          <Form.Item name="department" label="部门" rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder="请选择部门" allowClear>
              {departments.map(dept => (<Option key={dept.code} value={dept.name}>{dept.name}</Option>))}
            </Select>
          </Form.Item>
          <Form.Item name="stock_out_date" label="出库日期" rules={[{ required: true, message: '请选择出库日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StockOut; 