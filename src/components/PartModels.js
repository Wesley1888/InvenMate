import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  message,
  Typography,
  Tag,
  Tooltip,
  Popconfirm
} from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const PartModels = () => {
  const [partModels, setPartModels] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadPartModels();
    
    // 监听数据变化
    const unsubscribe = partModelsService.addListener((models) => {
      setPartModels(models || []);
    });

    return unsubscribe;
  }, []);

  const loadPartModels = async () => {
    try {
      const models = await partModelsService.getAll();
      setPartModels(models);
    } catch (error) {
      console.error('加载配件型号失败:', error);
      message.error('加载配件型号失败');
    }
  };

  const handleAdd = () => {
    setEditingModel(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingModel(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await partModelsService.delete(id);
      message.success('删除成功');
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingModel) {
        // 更新记录
        await partModelsService.update(editingModel.id, values);
        message.success('更新成功');
      } else {
        // 新增记录
        await partModelsService.add(values);
        message.success('添加成功');
      }

      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = partModels.filter(model =>
    model.model_code.toLowerCase().includes(searchText.toLowerCase()) ||
    model.model_name.toLowerCase().includes(searchText.toLowerCase()) ||
    model.specification.toLowerCase().includes(searchText.toLowerCase()) ||
    model.category.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: '型号编码',
      dataIndex: 'model_code',
      key: 'model_code',
      width: 120,
    },
    {
      title: '型号名称',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 150,
    },
    {
      title: '规格',
      dataIndex: 'specification',
      key: 'specification',
      width: 120,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: '8px', whiteSpace: 'nowrap' }}>
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(record);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个配件型号吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            >
              删除
            </Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const categoryOptions = [
    { value: '计算机', label: '计算机' },
    { value: '网络设备', label: '网络设备' },
    { value: '存储设备', label: '存储设备' },
    { value: '显示器', label: '显示器' },
    { value: '外设', label: '外设' },
    { value: '内存', label: '内存' },
    { value: '服务器', label: '服务器' },
    { value: '打印机', label: '打印机' },
    { value: '其他', label: '其他' },
  ];

  const unitOptions = [
    { value: '台', label: '台' },
    { value: '个', label: '个' },
    { value: '件', label: '件' },
    { value: '套', label: '套' },
    { value: '条', label: '条' },
    { value: '块', label: '块' },
    { value: '包', label: '包' },
    { value: '箱', label: '箱' },
  ];

  return (
    <div>
      <Title level={2}>配件型号管理</Title>
      
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Input
              placeholder="搜索型号编码、名称、规格或分类"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增型号
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredModels} 
          rowKey="id"
          size="small"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingModel ? '编辑配件型号' : '新增配件型号'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            unit: '台',
            category: '计算机'
          }}
        >
          <Form.Item
            name="model_code"
            label="型号编码"
            rules={[
              { required: true, message: '请输入型号编码' },
              { max: 50, message: '型号编码不能超过50个字符' }
            ]}
          >
                         <Input placeholder="请输入型号编码，如：PC-DELL-7010" />
          </Form.Item>

          <Form.Item
            name="model_name"
            label="型号名称"
            rules={[
              { required: true, message: '请输入型号名称' },
              { max: 100, message: '型号名称不能超过100个字符' }
            ]}
          >
                         <Input placeholder="请输入型号名称，如：戴尔 OptiPlex 7010" />
          </Form.Item>

          <Form.Item
            name="specification"
            label="规格"
            rules={[
              { required: true, message: '请输入规格' },
              { max: 100, message: '规格不能超过100个字符' }
            ]}
          >
                         <Input placeholder="请输入规格，如：i5-3470/8GB/500GB" />
          </Form.Item>

          <Form.Item
            name="category"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              {categoryOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="unit"
            label="单位"
            rules={[{ required: true, message: '请选择单位' }]}
          >
            <Select placeholder="请选择单位">
              {unitOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ max: 200, message: '描述不能超过200个字符' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="请输入配件描述（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartModels;
