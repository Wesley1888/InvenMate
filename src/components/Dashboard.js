import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Progress, Typography } from 'antd';
import { 
  InboxOutlined, 
  ExportOutlined, 
  ShoppingCartOutlined, 
  DatabaseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';

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
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    // 模拟数据加载
    setStatistics({
      totalParts: 156,
      totalOrders: 23,
      totalStockIn: 89,
      totalStockOut: 67,
      lowStockItems: 8
    });

    setRecentActivities([
      {
        key: '1',
        type: '入库',
        part: '戴尔 OptiPlex 7010',
        quantity: 5,
        date: '2024-01-15 14:30',
        operator: '张三'
      },
      {
        key: '2',
        type: '出库',
        part: '金士顿 DataTraveler 32GB',
        quantity: 10,
        date: '2024-01-15 13:15',
        operator: '李四'
      },
      {
        key: '3',
        type: '入库',
        part: 'H3C S5120-28P-LI',
        quantity: 2,
        date: '2024-01-15 11:45',
        operator: '王五'
      },
      {
        key: '4',
        type: '出库',
        part: '罗技 K120 键盘',
        quantity: 8,
        date: '2024-01-15 10:20',
        operator: '赵六'
      }
    ]);

    setLowStockItems([
      {
        key: '1',
        part: '戴尔 OptiPlex 7010',
        currentStock: 2,
        minStock: 5,
        percentage: 40
      },
      {
        key: '2',
        part: '金士顿 DataTraveler 32GB',
        currentStock: 15,
        minStock: 50,
        percentage: 30
      },
      {
        key: '3',
        part: '罗技 K120 键盘',
        currentStock: 5,
        minStock: 20,
        percentage: 25
      }
    ]);
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
          <Card title="低库存警告" style={{ marginBottom: 16 }}>
            <Table 
              columns={lowStockColumns} 
              dataSource={lowStockItems} 
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 