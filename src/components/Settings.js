import React from 'react';
import { Card, Typography, Descriptions, Space, Button, message } from 'antd';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const { Title } = Typography;

const Settings = () => {
  const handleOpenLogs = async () => {
    if (!ipcRenderer) return message.error('无法访问 Electron IPC');
    const ok = await ipcRenderer.invoke('logs:openDir');
    if (!ok) message.error('打开日志目录失败');
  };

  const handleClearLogs = async () => {
    if (!ipcRenderer) return message.error('无法访问 Electron IPC');
    const ok = await ipcRenderer.invoke('logs:clear');
    ok ? message.success('日志已清空') : message.error('清空失败');
  };

  return (
    <div>
      <Title level={2}>系统设置</Title>
      
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="系统信息" size="small">
          <Descriptions column={2}>
            <Descriptions.Item label="应用名称">InvenMate</Descriptions.Item>
            <Descriptions.Item label="版本">1.0.15</Descriptions.Item>
            <Descriptions.Item label="描述">周转库配件耗材管理系统</Descriptions.Item>
            <Descriptions.Item label="作者">InvenMate</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="日志管理" size="small">
          <Space>
            <Button onClick={handleOpenLogs}>打开日志目录</Button>
            <Button danger onClick={handleClearLogs}>清空日志</Button>
          </Space>
        </Card>

        <Card title="数据库信息" size="small">
          <p><strong>当前使用：SQLite 数据库</strong></p>
          <ul>
            <li>数据文件：invenmate.db（用户数据目录）</li>
            <li>写入模式：DELETE（保存后立即写入主文件）</li>
            <li>数据存储：所有业务数据存储在关系表中</li>
            <li>配置存储：UI设置存储在 app_data 表中</li>
          </ul>
        </Card>
      </Space>
    </div>
  );
};

export default Settings; 