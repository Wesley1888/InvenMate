import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  InboxOutlined,
  ExportOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  ToolOutlined
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import StockIn from './components/StockIn';
import StockOut from './components/StockOut';
import Orders from './components/Orders';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Settings from './components/Settings';
import PartModels from './components/PartModels';

const { Header, Sider, Content } = Layout;

function App() {
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [autoOpenModal, setAutoOpenModal] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: 'part-models',
      icon: <ToolOutlined />,
      label: '配件型号',
    },
    {
      key: 'stock-in',
      icon: <InboxOutlined />,
      label: '入库管理',
    },
    {
      key: 'stock-out',
      icon: <ExportOutlined />,
      label: '出库管理',
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: '订单管理',
    },
    {
      key: 'inventory',
      icon: <DatabaseOutlined />,
      label: '库存管理',
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: '报表统计',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const handleNavigation = (key, fromQuickAction = false) => {
    setSelectedKey(key);
    // 只有从快捷操作导航才设置自动打开模态框
    if (fromQuickAction && ['stock-in', 'stock-out', 'orders'].includes(key)) {
      setAutoOpenModal(true);
    } else {
      setAutoOpenModal(false);
    }
  };

  const handleModalClose = () => {
    setAutoOpenModal(false);
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      case 'part-models':
        return <PartModels />;
      case 'stock-in':
        return <StockIn autoOpenModal={autoOpenModal} onModalClose={handleModalClose} />;
      case 'stock-out':
        return <StockOut autoOpenModal={autoOpenModal} onModalClose={handleModalClose} />;
      case 'orders':
        return <Orders autoOpenModal={autoOpenModal} onModalClose={handleModalClose} />;
      case 'inventory':
        return <Inventory />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: colorBgContainer,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto'
        }}
      >
        <div className="logo" style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#001529',
          fontSize: collapsed ? 16 : 20,
          fontWeight: 'bold'
        }}>
          {collapsed ? 'IM' : 'InvenMate'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => handleNavigation(key, false)}
        />
      </Sider>
      <Layout style={{ minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 16,
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? '☰' : '✕'}
            </span>
            <span style={{ fontSize: 18, fontWeight: 'bold', color: '#001529' }}>
              周转库配件耗材管理系统
            </span>
          </div>
          <div style={{ marginRight: 24 }}>
            <UserOutlined style={{ fontSize: 18, marginRight: 8 }} />
            <span>管理员</span>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            minWidth: 0,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            height: 'calc(100vh - 64px - 48px)',
            overflow: 'auto'
          }}
        >
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App; 