import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  DatePicker, 
  Select, 
  Button, 
  Space,
  Typography,
  Tabs,
  Progress
} from 'antd';
import { 
  BarChartOutlined, 
  PieChartOutlined, 
  LineChartOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const Reports = () => {
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [reportType, setReportType] = useState('monthly');
  const [loading, setLoading] = useState(false);

  // 模拟报表数据
  const [reportData, setReportData] = useState({
    summary: {
      totalIn: 1250,
      totalOut: 890,
      totalValue: 15680.50,
      totalOrders: 15
    },
    topItems: [
      { name: '轴承 6205-2RS', inQty: 200, outQty: 150, value: 3875.00 },
      { name: '密封圈 25x32x4', inQty: 300, outQty: 180, value: 2240.00 },
      { name: '螺栓 M8x20', inQty: 500, outQty: 320, value: 1530.00 },
      { name: '垫片 8mm', inQty: 800, outQty: 450, value: 525.00 }
    ],
    departmentStats: [
      { department: '生产部', quantity: 450, value: 6750.00 },
      { department: '维修部', quantity: 280, value: 4200.00 },
      { department: '质检部', quantity: 120, value: 1800.00 },
      { department: '研发部', quantity: 40, value: 600.00 }
    ],
    monthlyTrend: [
      { month: '2024-01', inQty: 1250, outQty: 890, value: 15680.50 },
      { month: '2023-12', inQty: 1100, outQty: 780, value: 14200.00 },
      { month: '2023-11', inQty: 980, outQty: 720, value: 12800.00 }
    ]
  });

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleExport = (type) => {
    // 模拟导出功能
    console.log(`导出${type}报表`);
  };

  const summaryColumns = [
    {
      title: '指标',
      dataIndex: 'metric',
      key: 'metric',
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => {
        if (record.type === 'currency') {
          return `¥${value.toFixed(2)}`;
        }
        return value;
      }
    },
    {
      title: '环比',
      dataIndex: 'change',
      key: 'change',
      render: (change) => {
        const color = change > 0 ? '#52c41a' : change < 0 ? '#ff4d4f' : '#8c8c8c';
        const prefix = change > 0 ? '+' : '';
        return <span style={{ color }}>{prefix}{change}%</span>;
      }
    }
  ];

  const topItemsColumns = [
    {
      title: '配件名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '入库数量',
      dataIndex: 'inQty',
      key: 'inQty',
      render: (qty) => `${qty} 个`
    },
    {
      title: '出库数量',
      dataIndex: 'outQty',
      key: 'outQty',
      render: (qty) => `${qty} 个`
    },
    {
      title: '库存价值',
      dataIndex: 'value',
      key: 'value',
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '周转率',
      key: 'turnover',
      render: (_, record) => {
        const rate = ((record.outQty / (record.inQty + record.outQty)) * 100).toFixed(1);
        return (
          <Progress 
            percent={parseFloat(rate)} 
            size="small" 
            format={() => `${rate}%`}
          />
        );
      }
    }
  ];

  const departmentColumns = [
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '领用数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty) => `${qty} 个`
    },
    {
      title: '领用金额',
      dataIndex: 'value',
      key: 'value',
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '占比',
      key: 'percentage',
      render: (_, record) => {
        const total = reportData.departmentStats.reduce((sum, item) => sum + item.value, 0);
        const percentage = ((record.value / total) * 100).toFixed(1);
        return (
          <Progress 
            percent={parseFloat(percentage)} 
            size="small" 
            format={() => `${percentage}%`}
          />
        );
      }
    }
  ];

  const trendColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
    },
    {
      title: '入库数量',
      dataIndex: 'inQty',
      key: 'inQty',
      render: (qty) => `${qty} 个`
    },
    {
      title: '出库数量',
      dataIndex: 'outQty',
      key: 'outQty',
      render: (qty) => `${qty} 个`
    },
    {
      title: '库存价值',
      dataIndex: 'value',
      key: 'value',
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '净变化',
      key: 'netChange',
      render: (_, record) => {
        const net = record.inQty - record.outQty;
        const color = net > 0 ? '#52c41a' : net < 0 ? '#ff4d4f' : '#8c8c8c';
        const prefix = net > 0 ? '+' : '';
        return <span style={{ color }}>{prefix}{net} 个</span>;
      }
    }
  ];

  const summaryData = [
    { metric: '总入库数量', value: reportData.summary.totalIn, change: 12.5, type: 'number' },
    { metric: '总出库数量', value: reportData.summary.totalOut, change: -8.3, type: 'number' },
    { metric: '库存总价值', value: reportData.summary.totalValue, change: 5.2, type: 'currency' },
    { metric: '订单总数', value: reportData.summary.totalOrders, change: 15.0, type: 'number' }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>报表统计</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 250 }}
          />
          <Select
            value={reportType}
            onChange={setReportType}
            style={{ width: 120 }}
          >
            <Option value="monthly">月度报表</Option>
            <Option value="quarterly">季度报表</Option>
            <Option value="yearly">年度报表</Option>
          </Select>
          <Button 
            icon={<ReloadOutlined />}
            onClick={loadReportData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总入库数量"
              value={reportData.summary.totalIn}
              valueStyle={{ color: '#52c41a' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总出库数量"
              value={reportData.summary.totalOut}
              valueStyle={{ color: '#ff4d4f' }}
              suffix="个"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={reportData.summary.totalValue}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={reportData.summary.totalOrders}
              valueStyle={{ color: '#722ed1' }}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 报表内容 */}
      <Tabs defaultActiveKey="summary">
        <TabPane tab="统计概览" key="summary">
          <Card
            title="关键指标"
            extra={
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('summary')}>
                导出
              </Button>
            }
          >
            <Table 
              columns={summaryColumns} 
              dataSource={summaryData}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="热门配件" key="topItems">
          <Card
            title="热门配件统计"
            extra={
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('topItems')}>
                导出
              </Button>
            }
          >
            <Table 
              columns={topItemsColumns} 
              dataSource={reportData.topItems}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="部门统计" key="department">
          <Card
            title="部门领用统计"
            extra={
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('department')}>
                导出
              </Button>
            }
          >
            <Table 
              columns={departmentColumns} 
              dataSource={reportData.departmentStats}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>

        <TabPane tab="趋势分析" key="trend">
          <Card
            title="月度趋势"
            extra={
              <Button icon={<DownloadOutlined />} onClick={() => handleExport('trend')}>
                导出
              </Button>
            }
          >
            <Table 
              columns={trendColumns} 
              dataSource={reportData.monthlyTrend}
              pagination={false}
              size="small"
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Reports; 