import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Switch, 
  Select, 
  InputNumber,
  message,
  Typography,
  Divider,
  Row,
  Col,
  Space,
  Alert
} from 'antd';
import { SaveOutlined, ReloadOutlined, DatabaseOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Settings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 模拟设置数据
  const [settings, setSettings] = useState({
    company: {
      name: '某某机械制造有限公司',
      address: '上海市浦东新区某某路123号',
      phone: '021-12345678',
      email: 'info@company.com'
    },
    system: {
      autoBackup: true,
      backupInterval: 24,
      lowStockAlert: true,
      lowStockThreshold: 20,
      currency: 'CNY',
      language: 'zh-CN'
    },
    inventory: {
      defaultUnit: '个',
      allowNegativeStock: false,
      requireApproval: true,
      maxOrderQuantity: 1000
    }
  });

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // 模拟保存操作
      setTimeout(() => {
        setSettings(values);
        message.success('设置保存成功');
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(settings);
    message.info('设置已重置');
  };

  const systemInfo = {
    version: '1.0.0',
    buildDate: '2024-01-15',
    database: 'SQLite 3.42.0',
    platform: 'Windows 10',
    memory: '8GB',
    diskSpace: '500GB'
  };

  return (
    <div>
      <Title level={2}>系统设置</Title>

      <Row gutter={16}>
        <Col span={16}>
          <Form
            form={form}
            layout="vertical"
            initialValues={settings}
            onFinish={handleSave}
          >
            {/* 公司信息设置 */}
            <Card title="公司信息" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['company', 'name']}
                    label="公司名称"
                    rules={[{ required: true, message: '请输入公司名称' }]}
                  >
                    <Input placeholder="请输入公司名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['company', 'phone']}
                    label="联系电话"
                    rules={[{ required: true, message: '请输入联系电话' }]}
                  >
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name={['company', 'address']}
                label="公司地址"
                rules={[{ required: true, message: '请输入公司地址' }]}
              >
                <Input placeholder="请输入公司地址" />
              </Form.Item>
              <Form.Item
                name={['company', 'email']}
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Card>

            {/* 系统设置 */}
            <Card title="系统设置" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'autoBackup']}
                    label="自动备份"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'backupInterval']}
                    label="备份间隔(小时)"
                    rules={[{ required: true, message: '请输入备份间隔' }]}
                  >
                    <InputNumber min={1} max={168} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'lowStockAlert']}
                    label="库存不足提醒"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'lowStockThreshold']}
                    label="库存预警阈值(%)"
                    rules={[{ required: true, message: '请输入预警阈值' }]}
                  >
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'currency']}
                    label="货币单位"
                    rules={[{ required: true, message: '请选择货币单位' }]}
                  >
                    <Select>
                      <Option value="CNY">人民币 (CNY)</Option>
                      <Option value="USD">美元 (USD)</Option>
                      <Option value="EUR">欧元 (EUR)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['system', 'language']}
                    label="系统语言"
                    rules={[{ required: true, message: '请选择系统语言' }]}
                  >
                    <Select>
                      <Option value="zh-CN">简体中文</Option>
                      <Option value="en-US">English</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 库存设置 */}
            <Card title="库存设置" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['inventory', 'defaultUnit']}
                    label="默认单位"
                    rules={[{ required: true, message: '请输入默认单位' }]}
                  >
                    <Input placeholder="如：个、件、套" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['inventory', 'maxOrderQuantity']}
                    label="最大订单数量"
                    rules={[{ required: true, message: '请输入最大订单数量' }]}
                  >
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['inventory', 'allowNegativeStock']}
                    label="允许负库存"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['inventory', 'requireApproval']}
                    label="出库需要审批"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 操作按钮 */}
            <Card>
              <Space>
                <Button 
                  type="primary" 
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={loading}
                >
                  保存设置
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                >
                  重置
                </Button>
              </Space>
            </Card>
          </Form>
        </Col>

        <Col span={8}>
          {/* 系统信息 */}
          <Card title="系统信息" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong>版本信息</Text>
              <div>版本号：{systemInfo.version}</div>
              <div>构建日期：{systemInfo.buildDate}</div>
            </div>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <Text strong>数据库信息</Text>
              <div>数据库类型：{systemInfo.database}</div>
              <div>数据库路径：%APPDATA%/InvenMate/invenmate.db</div>
            </div>
            <Divider />
            <div style={{ marginBottom: 16 }}>
              <Text strong>系统环境</Text>
              <div>操作系统：{systemInfo.platform}</div>
              <div>内存：{systemInfo.memory}</div>
              <div>磁盘空间：{systemInfo.diskSpace}</div>
            </div>
          </Card>

          {/* 快捷操作 */}
          <Card title="快捷操作">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                icon={<DatabaseOutlined />}
                block
                onClick={() => message.info('数据库备份功能开发中...')}
              >
                数据库备份
              </Button>
              <Button 
                icon={<SettingOutlined />}
                block
                onClick={() => message.info('系统维护功能开发中...')}
              >
                系统维护
              </Button>
            </Space>
          </Card>

          {/* 注意事项 */}
          <Card title="注意事项" style={{ marginTop: 16 }}>
            <Alert
              message="重要提醒"
              description="修改系统设置可能会影响系统运行，请谨慎操作。建议在修改前先备份数据库。"
              type="warning"
              showIcon
              style={{ marginBottom: 8 }}
            />
            <Alert
              message="备份建议"
              description="建议定期备份数据库文件，备份文件位于用户数据目录中。"
              type="info"
              showIcon
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings; 