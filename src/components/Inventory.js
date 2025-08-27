import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Input, 
  Select, 
  Space, 
  message,
  Typography,
  Tag,
  Tooltip,
  Progress,
  Row,
  Col,
  Statistic
} from 'antd';
import { SearchOutlined, ReloadOutlined, WarningOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // 模拟库存数据
  const inventoryData = [
    {
      id: 1,
      model_code: 'BEAR-6205',
      model_name: '轴承 6205-2RS',
      specification: '25x52x15mm',
      category: '轴承',
      unit: '个',
      current_quantity: 85,
      min_quantity: 20,
      max_quantity: 200,
      average_cost: 15.50,
      total_value: 1317.50,
      last_updated: '2024-01-15 14:30'
    },
    {
      id: 2,
      model_code: 'SEAL-25x32',
      model_name: '密封圈 25x32x4',
      specification: '25x32x4mm',
      category: '密封件',
      unit: '个',
      current_quantity: 142,
      min_quantity: 30,
      max_quantity: 300,
      average_cost: 2.80,
      total_value: 397.60,
      last_updated: '2024-01-15 13:15'
    },
    {
      id: 3,
      model_code: 'BOLT-M8x20',
      model_name: '螺栓 M8x20',
      specification: 'M8x20mm',
      category: '紧固件',
      unit: '个',
      current_quantity: 188,
      min_quantity: 50,
      max_quantity: 500,
      average_cost: 0.85,
      total_value: 159.80,
      last_updated: '2024-01-15 11:45'
    },
    {
      id: 4,
      model_code: 'WASHER-8',
      model_name: '垫片 8mm',
      specification: '8mm',
      category: '紧固件',
      unit: '个',
      current_quantity: 270,
      min_quantity: 100,
      max_quantity: 1000,
      average_cost: 0.15,
      total_value: 40.50,
      last_updated: '2024-01-15 10:20'
    }
  ];

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchText, categoryFilter]);

  const loadInventory = () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setInventory(inventoryData);
      setLoading(false);
    }, 500);
  };

  const filterInventory = () => {
    let filtered = [...inventory];

    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(item => 
        item.model_code.toLowerCase().includes(searchText.toLowerCase()) ||
        item.model_name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按类别过滤
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    setFilteredInventory(filtered);
  };

  const getStockLevel = (current, min) => {
    const percentage = (current / min) * 100;
    if (percentage < 50) return { status: 'exception', text: '严重不足' };
    if (percentage < 100) return { status: 'warning', text: '库存不足' };
    if (percentage > 200) return { status: 'success', text: '库存充足' };
    return { status: 'normal', text: '库存正常' };
  };

  const getStockLevelTag = (current, min) => {
    const level = getStockLevel(current, min);
    return <Tag color={level.status === 'exception' ? 'red' : level.status === 'warning' ? 'orange' : 'green'}>{level.text}</Tag>;
  };

  const columns = [
    {
      title: '型号编码',
      dataIndex: 'model_code',
      key: 'model_code',
      width: 120,
    },
    {
      title: '配件名称',
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
      title: '类别',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => <Tag color="blue">{category}</Tag>
    },
    {
      title: '当前库存',
      dataIndex: 'current_quantity',
      key: 'current_quantity',
      width: 120,
      render: (quantity, record) => `${quantity} ${record.unit}`
    },
    {
      title: '最低库存',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      width: 100,
    },
    {
      title: '库存水平',
      key: 'stock_level',
      width: 150,
      render: (_, record) => {
        const percentage = (record.current_quantity / record.min_quantity) * 100;
        const level = getStockLevel(record.current_quantity, record.min_quantity);
        return (
          <div>
            <Progress 
              percent={Math.min(percentage, 200)} 
              size="small" 
              status={level.status}
              format={() => `${record.current_quantity}/${record.min_quantity}`}
            />
            {getStockLevelTag(record.current_quantity, record.min_quantity)}
          </div>
        );
      }
    },
    {
      title: '平均成本',
      dataIndex: 'average_cost',
      key: 'average_cost',
      width: 100,
      render: (cost) => `¥${cost.toFixed(2)}`
    },
    {
      title: '库存价值',
      dataIndex: 'total_value',
      key: 'total_value',
      width: 120,
      render: (value) => `¥${value.toFixed(2)}`
    },
    {
      title: '最后更新',
      dataIndex: 'last_updated',
      key: 'last_updated',
      width: 150,
    }
  ];

  const categories = ['轴承', '密封件', '紧固件', '电气件', '液压件'];

  const getStatistics = () => {
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => 
      item.current_quantity < item.min_quantity
    ).length;
    const totalValue = inventory.reduce((sum, item) => sum + item.total_value, 0);
    const totalQuantity = inventory.reduce((sum, item) => sum + item.current_quantity, 0);

    return { totalItems, lowStockItems, totalValue, totalQuantity };
  };

  const stats = getStatistics();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>库存管理</Title>
        <Button 
          icon={<ReloadOutlined />}
          onClick={loadInventory}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="配件种类"
              value={stats.totalItems}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存不足"
              value={stats.lowStockItems}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总库存数量"
              value={stats.totalQuantity}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats.totalValue}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和过滤 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <Search
            placeholder="搜索配件型号、名称或规格"
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={setSearchText}
          />
          <Select
            placeholder="选择类别"
            style={{ width: 150 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            allowClear
          >
            <Option value="all">全部类别</Option>
            {categories.map(category => (
              <Option key={category} value={category}>{category}</Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* 库存表格 */}
      <Card>
        <Table 
          columns={columns} 
          dataSource={filteredInventory}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
          }}
          rowClassName={(record) => {
            if (record.current_quantity < record.min_quantity) {
              return 'low-stock-row';
            }
            return '';
          }}
        />
      </Card>

      <style jsx>{`
        .low-stock-row {
          background-color: #fff2f0;
        }
        .low-stock-row:hover > td {
          background-color: #ffccc7 !important;
        }
      `}</style>
    </div>
  );
};

export default Inventory; 