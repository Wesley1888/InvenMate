const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

class PartModelsService {
  constructor() {
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(models) {
    this.listeners.forEach(cb => cb(models));
  }

  async getAll(search) {
    if (!ipcRenderer) return [];
    const rows = await ipcRenderer.invoke('pm:list', { search });
    return rows || [];
  }

  async add(model) {
    if (!ipcRenderer) return null;
    const res = await ipcRenderer.invoke('pm:create', model);
    if (res?.ok) {
      const models = await this.getAll();
      this.notify(models);
      return { id: res.id, ...model };
    }
    throw new Error(res?.error || '创建失败');
  }

  async update(id, updates) {
    if (!ipcRenderer) return null;
    const res = await ipcRenderer.invoke('pm:update', { id, updates });
    if (res?.ok) {
      const models = await this.getAll();
      this.notify(models);
      return { id, ...updates };
    }
    throw new Error(res?.error || '更新失败');
  }

  async delete(id) {
    if (!ipcRenderer) return false;
    const res = await ipcRenderer.invoke('pm:delete', id);
    if (res?.ok) {
      const models = await this.getAll();
      this.notify(models);
      return true;
    }
    throw new Error(res?.error || '删除失败');
  }
}

const partModelsService = new PartModelsService();
export default partModelsService;
