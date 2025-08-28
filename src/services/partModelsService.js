const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

const STORAGE_KEY = 'invenmate_part_models';

class PartModelsService {
  constructor() {
    this.cache = null;
    this.listeners = [];
  }

  // 添加监听器
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // 通知所有监听器
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.cache));
  }

  // 持久化数据
  async persist(models) {
    try {
      if (ipcRenderer) {
        await ipcRenderer.invoke('appData:set', STORAGE_KEY, models);
      }
      this.cache = models;
      this.notifyListeners();
    } catch (error) {
      console.error('保存配件型号数据失败:', error);
    }
  }

  // 加载数据
  async load() {
    try {
      if (ipcRenderer) {
        const data = await ipcRenderer.invoke('appData:get', STORAGE_KEY);
        if (data) {
          this.cache = data;
          return data;
        }
      }
    } catch (error) {
      console.error('加载配件型号数据失败:', error);
    }

    // 首次默认示例数据 - 信息化设备
    const seed = [
      { id: 1, model_code: 'PC-DELL-7010', model_name: '戴尔 OptiPlex 7010', specification: 'i5-3470/8GB/500GB', unit: '台', category: '计算机', description: '台式电脑，办公用' },
      { id: 2, model_code: 'SW-H3C-S5120', model_name: 'H3C S5120-28P-LI', specification: '24口千兆交换机', unit: '台', category: '网络设备', description: '企业级交换机' },
      { id: 3, model_code: 'USB-KINGSTON-32G', model_name: '金士顿 DataTraveler 32GB', specification: '32GB USB3.0', unit: '个', category: '存储设备', description: 'U盘，数据传输用' },
      { id: 4, model_code: 'MONITOR-DELL-P2419H', model_name: '戴尔 P2419H 显示器', specification: '24寸 1920x1080', unit: '台', category: '显示器', description: 'IPS面板显示器' },
      { id: 5, model_code: 'KB-LOGITECH-K120', model_name: '罗技 K120 键盘', specification: '有线 USB键盘', unit: '个', category: '外设', description: '标准办公键盘' },
      { id: 6, model_code: 'MOUSE-LOGITECH-M100', model_name: '罗技 M100 鼠标', specification: '有线 USB鼠标', unit: '个', category: '外设', description: '标准办公鼠标' },
      { id: 7, model_code: 'ROUTER-TP-LINK-WR841N', model_name: 'TP-LINK WR841N', specification: '300M 无线路由器', unit: '台', category: '网络设备', description: '家用路由器' },
      { id: 8, model_code: 'HDD-WD-1TB', model_name: '西部数据 1TB 硬盘', specification: '1TB SATA3 7200转', unit: '个', category: '存储设备', description: '机械硬盘' },
      { id: 9, model_code: 'SSD-SAMSUNG-256G', model_name: '三星 860 EVO 256GB', specification: '256GB SATA3 SSD', unit: '个', category: '存储设备', description: '固态硬盘' },
      { id: 10, model_code: 'RAM-KINGSTON-8G', model_name: '金士顿 DDR4 8GB', specification: '8GB DDR4 2666MHz', unit: '条', category: '内存', description: '台式机内存条' },
    ];
    
    this.cache = seed;
    await this.persist(seed);
    return seed;
  }

  // 获取所有配件型号
  async getAll() {
    if (this.cache) {
      return this.cache;
    }
    return await this.load();
  }

  // 根据名称查找配件型号
  async findByName(modelName) {
    const models = await this.getAll();
    return models.find(model => model.model_name === modelName);
  }

  // 根据编码查找配件型号
  async findByCode(modelCode) {
    const models = await this.getAll();
    return models.find(model => model.model_code === modelCode);
  }

  // 添加配件型号
  async add(model) {
    const models = await this.getAll();
    const newModel = {
      ...model,
      id: Date.now()
    };
    const updatedModels = [newModel, ...models];
    await this.persist(updatedModels);
    return newModel;
  }

  // 更新配件型号
  async update(id, updates) {
    const models = await this.getAll();
    const updatedModels = models.map(model => 
      model.id === id ? { ...model, ...updates } : model
    );
    await this.persist(updatedModels);
    return updatedModels.find(model => model.id === id);
  }

  // 删除配件型号
  async delete(id) {
    const models = await this.getAll();
    const updatedModels = models.filter(model => model.id !== id);
    await this.persist(updatedModels);
  }

  // 搜索配件型号
  async search(keyword) {
    const models = await this.getAll();
    const lowerKeyword = keyword.toLowerCase();
    return models.filter(model =>
      model.model_code.toLowerCase().includes(lowerKeyword) ||
      model.model_name.toLowerCase().includes(lowerKeyword) ||
      model.specification.toLowerCase().includes(lowerKeyword) ||
      model.category.toLowerCase().includes(lowerKeyword)
    );
  }

  // 按分类获取配件型号
  async getByCategory(category) {
    const models = await this.getAll();
    return models.filter(model => model.category === category);
  }

  // 获取所有分类
  async getCategories() {
    const models = await this.getAll();
    const categories = [...new Set(models.map(model => model.category))];
    return categories.sort();
  }

  // 获取所有单位
  async getUnits() {
    const models = await this.getAll();
    const units = [...new Set(models.map(model => model.unit))];
    return units.sort();
  }
}

// 创建单例实例
const partModelsService = new PartModelsService();

export default partModelsService;
