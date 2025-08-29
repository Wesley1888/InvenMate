import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Progress, Typography, Button, List, Space, Tag } from 'antd';
import { 
  InboxOutlined, 
  ExportOutlined, 
  ShoppingCartOutlined, 
  DatabaseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const { Title } = Typography;

const Dashboard = ({ onNavigate }) => {
  const [statistics, setStatistics] = useState({
    totalParts: 0,
    totalOrders: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    lowStockItems: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!ipcRenderer) return;
        
        // 加载统计数据
        const stats = await ipcRenderer.invoke('dashboard:statistics');
        if (stats) {
          setStatistics(stats);
        }
        
        // 加载最近活动
        const activities = await ipcRenderer.invoke('dashboard:recentActivities');
        if (activities) {
          setRecentActivities(activities);
        }
        
        // 加载低库存数据
        const lowStockData = await ipcRenderer.invoke('inventory:lowStock');
        if (lowStockData) {
          setLowStock(lowStockData);
        }
        
      } catch (e) {
        console.error('加载仪表盘数据失败:', e);
      }
    };
    
    loadData();
  }, []);

  const activityColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span style={{ 
          color: type === '入库' ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold'
        }}>
          {type}
        </span>
      )
    },
    {
      title: '配件',
      dataIndex: 'part',
      key: 'part',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '操作员',
      dataIndex: 'operator',
      key: 'operator',
    }
  ];

  const lowStockColumns = [
    {
      title: '配件',
      dataIndex: 'part',
      key: 'part',
    },
    {
      title: '当前库存',
      dataIndex: 'currentStock',
      key: 'currentStock',
    },
    {
      title: '最低库存',
      dataIndex: 'minStock',
      key: 'minStock',
    },
    {
      title: '库存水平',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (percentage) => (
        <Progress 
          percent={percentage} 
          size="small" 
          status={percentage < 30 ? 'exception' : 'normal'}
        />
      )
    }
  ];

  const gotoInventory = () => {
    onNavigate && onNavigate('inventory', false);
  };

  return (
    <div>
      <Title level={2}>系统概览</Title>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="配件型号总数"
              value={statistics.totalParts}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={statistics.totalOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月入库"
              value={statistics.totalStockIn}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月出库"
              value={statistics.totalStockOut}
              prefix={<ExportOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Card title="快速操作">
            <Row gutter={16}>
              <Col span={6}>
                <Card 
                  size="small" 
                  hoverable 
                  style={{ textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => onNavigate && onNavigate('stock-in', true)}
                >
                  <InboxOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                  <div style={{ marginTop: 8 }}>新建入库</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card 
                  size="small" 
                  hoverable 
                  style={{ textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => onNavigate && onNavigate('stock-out', true)}
                >
                  <ExportOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                  <div style={{ marginTop: 8 }}>新建出库</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card 
                  size="small" 
                  hoverable 
                  style={{ textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => onNavigate && onNavigate('orders', true)}
                >
                  <ShoppingCartOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                  <div style={{ marginTop: 8 }}>新建订单</div>
                </Card>
              </Col>
              <Col span={6}>
                <Card 
                  size="small" 
                  hoverable 
                  style={{ textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => onNavigate && onNavigate('inventory', true)}
                >
                  <DatabaseOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                  <div style={{ marginTop: 8 }}>库存查询</div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 最近活动和低库存警告 */}
      <Row gutter={16}>
        <Col span={16}>
          <Card title="最近活动" style={{ marginBottom: 16 }}>
            <Table 
              columns={activityColumns} 
              dataSource={recentActivities} 
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="低库存预警" extra={<Button type="link" onClick={gotoInventory}>查看全部</Button>}>
            <List
              dataSource={lowStock.slice(0, 5)}
              locale={{ emptyText: '暂无低库存' }}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Tag color="red">低</Tag>
                    <span style={{ minWidth: 140 }}>{item.model_code}</span>
                    <span>{item.model_name}</span>
                    <span>当前 {item.current}{item.unit || '个'}</span>
                    <span>阈值 {item.min_threshold}</span>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 