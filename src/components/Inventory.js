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
import { SearchOutlined, ReloadOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };
import partModelsService from '../services/partModelsService';

const { Title } = Typography;
const { Option } = Select;
const { Search } = Input;

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [inventory, searchText, categoryFilter]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      // 读取入库与出库（直接来自表）
      const [stockIns, stockOuts, partModels] = await Promise.all([
        ipcRenderer ? ipcRenderer.invoke('si:list') : Promise.resolve([]),
        ipcRenderer ? ipcRenderer.invoke('so:list') : Promise.resolve([]),
        partModelsService.getAll()
      ]);

      const modelIndex = new Map();
      partModels.forEach(m => {
        modelIndex.set(m.model_name, m);
      });

      const agg = new Map();
      (stockIns || []).forEach(r => {
        const key = r.part_model;
        const prev = agg.get(key) || { inQty: 0, inAmount: 0, outQty: 0, lastDate: r.stock_in_date };
        prev.inQty += Number(r.quantity) || 0;
        prev.inAmount += (Number(r.total_amount) || (Number(r.unit_price) || 0) * (Number(r.quantity) || 0));
        if (!prev.lastDate || r.stock_in_date > prev.lastDate) prev.lastDate = r.stock_in_date;
        agg.set(key, prev);
      });

      (stockOuts || []).forEach(r => {
        const key = r.part_model;
        const prev = agg.get(key) || { inQty: 0, inAmount: 0, outQty: 0, lastDate: r.stock_out_date };
        prev.outQty += Number(r.quantity) || 0;
        if (!prev.lastDate || r.stock_out_date > prev.lastDate) prev.lastDate = r.stock_out_date;
        agg.set(key, prev);
      });

      const rows = Array.from(agg.entries()).map(([modelName, v], idx) => {
        const model = modelIndex.get(modelName) || {};
        const current = Math.max(0, (v.inQty || 0) - (v.outQty || 0));
        const avgCost = v.inQty > 0 ? (v.inAmount / v.inQty) : 0;
        return {
          id: idx + 1,
          model_code: model.model_code || '',
          model_name: modelName,
          specification: model.specification || '',
          category: model.category || '其他',
          unit: model.unit || '个',
          current_quantity: current,
          min_quantity: Number(model.min_threshold) || 0,
          average_cost: avgCost,
          total_value: current * avgCost,
          last_updated: v.lastDate || ''
        };
      });

      const catSet = new Set(rows.map(r => r.category).filter(Boolean));
      setCategories(['all', ...Array.from(catSet)]);
      setInventory(rows);
    } catch (e) {
      console.error('加载库存失败:', e);
      message.error('加载库存失败');
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    let filtered = [...inventory];

    if (searchText) {
      filtered = filtered.filter(item => 
        (item.model_code || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.model_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.specification || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    setFilteredInventory(filtered);
  };

  const getStockLevel = (current, min) => {
    const base = min && min > 0 ? min : 1;
    const percentage = (current / base) * 100;
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
        const base = record.min_quantity && record.min_quantity > 0 ? record.min_quantity : 1;
        const percentage = (record.current_quantity / base) * 100;
        const level = getStockLevel(record.current_quantity, base);
        return (
          <div>
            <Progress 
              percent={Math.min(percentage, 200)} 
              size="small" 
              status={level.status}
              format={() => `${record.current_quantity}/${base}`}
            />
            {getStockLevelTag(record.current_quantity, base)}
          </div>
        );
      }
    },
    {
      title: '平均成本',
      dataIndex: 'average_cost',
      key: 'average_cost',
      width: 100,
      render: (cost) => `¥${(Number(cost) || 0).toFixed(2)}`
    },
    {
      title: '库存价值',
      dataIndex: 'total_value',
      key: 'total_value',
      width: 120,
      render: (value) => `¥${(Number(value) || 0).toFixed(2)}`
    },
    {
      title: '最后更新',
      dataIndex: 'last_updated',
      key: 'last_updated',
      width: 150,
    }
  ];

  const getStatistics = () => {
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => 
      item.min_quantity > 0 && item.current_quantity < item.min_quantity
    ).length;
    const totalValue = inventory.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0);
    const totalQuantity = inventory.reduce((sum, item) => sum + (Number(item.current_quantity) || 0), 0);

    return { totalItems, lowStockItems, totalValue, totalQuantity };
  };

  const stats = getStatistics();

  const handleExportExcel = async () => {
    if (!ipcRenderer) return message.error('无法访问 Electron IPC');
    const filters = {
      keyword: searchText || '',
      category: categoryFilter
    };
    const res = await ipcRenderer.invoke('export:inventoryExcel', { filters });
    if (res?.ok) message.success(`已导出: ${res.filePath}`);
    else message.error(res?.error || '导出失败');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>库存管理</Title>
        <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>导出 Excel</Button>
        <Button 
          icon={<ReloadOutlined />}
          onClick={loadInventory}
          loading={loading}
        >
          刷新
        </Button>
      </div>

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
            {categories.map(category => (
              <Option key={category} value={category}>{category === 'all' ? '全部类别' : category}</Option>
            ))}
          </Select>
        </Space>
      </Card>

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
            if (record.min_quantity > 0 && record.current_quantity < record.min_quantity) {
              return 'low-stock-row';
            }
            return '';
          }}
        />
      </Card>


    </div>
  );
};

export default Inventory; 