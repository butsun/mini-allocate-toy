var dom = document.getElementById('chart-container');
var myChart = echarts.init(dom, null, {
  renderer: 'canvas',
  useDirtyRect: false
});
var app = {};

var option;

// 初始数据
const data = [10, 10, 10, 10, 10, 10];
const stationNames = ['VIP01', 'VIP02', 'HIGH01', 'HIGH02', 'MID01', 'MID02'];

// 定义状态常量
const STATUS = {
  CHARGING: 'charging',
  NOT_CHARGING: 'notCharging'
};

// 记录每个柱子的状态
const barStatus = new Array(data.length).fill(STATUS.NOT_CHARGING);

// 状态对应的颜色
const STATUS_COLORS = {
  [STATUS.CHARGING]: '#ff4444',      // 充电中 - 红色
  [STATUS.NOT_CHARGING]: '#5470c6'   // 未充电 - 蓝色
};

// 总电力上限
let TOTAL_POWER_LIMIT = 100;

// 计算当前总电力
function calculateTotalPower() {
  return data.reduce((sum, val) => sum + val, 0);
}

// 更新当前电力显示
function updateCurrentPower() {
  const currentPower = calculateTotalPower();
  document.getElementById('currentPowerDisplay').textContent = currentPower;
}

// 更新电力上限的函数
function updatePowerLimit() {
  const input = document.getElementById('powerLimitInput');
  const newLimit = parseInt(input.value);
  
  if (isNaN(newLimit) || newLimit <= 0) {
    alert('请输入有效的电力上限值');
    return;
  }
  
  const currentTotal = calculateTotalPower();
  if (newLimit < currentTotal) {
    alert(`当前总电力(${currentTotal})已超过新的上限值(${newLimit})`);
    return;
  }
  
  TOTAL_POWER_LIMIT = newLimit;
  document.getElementById('powerLimitDisplay').textContent = newLimit;
}

// 定义类型常量
const STATION_TYPE = {
  VIP: 'VIP',
  HIGH: 'HIGH',
  MID: 'MID'
};
// 类型对应的颜色
const TYPE_COLORS = {
  [STATION_TYPE.VIP]: '#5470c6',   // 金色
  [STATION_TYPE.HIGH]: '#5470c6',  // 橙色
  [STATION_TYPE.MID]: '#5470c6'    // 绿色
};
// 记录每个柱子的类型
const barTypes = ['VIP', 'VIP', 'HIGH', 'HIGH', 'MID', 'MID'];

// 获取指定类型的站点数量
function getTypeCount(type) {
  return barTypes.filter(t => t === type).length;
}

// 重新生成站点名称
function regenerateStationNames() {
  const typeCounters = {
    [STATION_TYPE.VIP]: 0,
    [STATION_TYPE.HIGH]: 0,
    [STATION_TYPE.MID]: 0
  };

  barTypes.forEach((type, index) => {
    typeCounters[type]++;
    stationNames[index] = `${type}${String(typeCounters[type]).padStart(2, '0')}`;
  });
}

// 更新图表颜色的函数
function updateChartColors() {
  myChart.setOption({
    series: [{
      itemStyle: {
        color: function(params) {
          const status = barStatus[params.dataIndex];
          // 如果是充电状态，显示红色，否则显示对应类型的颜色
          return status === STATUS.CHARGING ? 
                 STATUS_COLORS[status] : 
                 TYPE_COLORS[barTypes[params.dataIndex]];
        }
      }
    }]
  });
}

// 更新表格状态的函数
function updateTableStatus(index) {
  const tbody = document.querySelector('.info-table tbody');
  if (!tbody) return;
  
  const row = tbody.children[index];
  if (!row) return;
  
  const statusCell = row.querySelector('.status-cell');
  if (!statusCell) return;
  
  const status = barStatus[index];
  statusCell.textContent = status === STATUS.CHARGING ? '充电中' : '未充电';
  statusCell.style.color = status === STATUS.CHARGING ? '#ff4444' : '#666';
}

// 更新图表
function updateChart() {
  myChart.setOption({
    series: [{
      name: '电力值',
      type: 'bar',
      data: data,
      itemStyle: {
        color: function(params) {
          return STATUS_COLORS[barStatus[params.dataIndex]];
        }
      },
      label: {
        show: true,
        position: 'inside',
        formatter: function(params) {
          const status = barStatus[params.dataIndex];
          const statusText = status === STATUS.CHARGING ? '充电中' : '未充电';
          return `${params.value}\n${statusText}`;
        }
      }
    }]
  });
}

// 注册点击事件
myChart.on('click', function(params) {
  if (params.componentType === 'series') {
    const index = params.dataIndex;
    // 切换状态
    barStatus[index] = barStatus[index] === STATUS.CHARGING ? 
                      STATUS.NOT_CHARGING : 
                      STATUS.CHARGING;
    
    // 更新表格状态
    updateTableStatus(index);
    
    // 更新图表
    updateChart();
  }
});

// 配置参数
const CONFIG = {
  TOTAL_POWER_LIMIT: 100,
  MIN_POWER: {
    VIP: 6,
    HIGH: 6,
    MID: 6
  },
  RATED_CURRENT: {
    VIP: 32,
    HIGH: 32,
    MID: 32
  },
  PRIORITY_ORDER: [
    { type: 'VIP', charging: true },
    { type: 'HIGH', charging: true },
    { type: 'MID', charging: true },
    { type: 'VIP', charging: false },
    { type: 'HIGH', charging: false },
    { type: 'MID', charging: false }
  ]
};

// 获取设备当前状态
function getDeviceStates() {
  return stationNames.map((name, index) => ({
    index,
    type: name.substring(0, name.length - 2),  // 提取类型（VIP/HIGH/MID）
    charging: barStatus[index] === STATUS.CHARGING
  }));
}

// 计算设备分配电力
function calculatePowerAllocation() {
  let remainingPower = TOTAL_POWER_LIMIT;
  const newData = new Array(6).fill(0);
  const deviceStates = getDeviceStates();
  
  // 按优先级顺序处理设备
  for (const priority of CONFIG.PRIORITY_ORDER) {
    // 如果剩余电力为0，停止分配
    if (remainingPower <= 0) break;

    // 找出符合当前优先级的设备
    const priorityDevices = deviceStates.filter(device => 
      device.type === priority.type && 
      device.charging === priority.charging &&
      newData[device.index] === 0  // 确保设备还未分配电力
    );
    
    if (priorityDevices.length === 0) continue;

    // 获取当前优先级设备的最小启动电力和额定电流
    const minPower = CONFIG.MIN_POWER[priority.type];
    const ratedCurrent = CONFIG.RATED_CURRENT[priority.type];
    
    // 计算每个设备可分配的电力，不超过额定电流
    const powerPerDevice = Math.min(
      Math.floor(remainingPower / priorityDevices.length),
      ratedCurrent
    );
    
    if (powerPerDevice >= minPower) {
      // 如果每个设备可分配的电力大于等于最小启动电力
      priorityDevices.forEach(device => {
        newData[device.index] = powerPerDevice;
        remainingPower -= powerPerDevice;
      });
    } else {
      // 当平均值小于最小起充数时，按设备名称排序逐一分配最小起充值
      const sortedDevices = [...priorityDevices].sort((a, b) => {
        return stationNames[a.index].localeCompare(stationNames[b.index]);
      });

      // 逐一为排序后的设备分配最小起充值
      for (const device of sortedDevices) {
        if (remainingPower >= minPower) {
          // 如果剩余电力足够最小起充值，则分配
          newData[device.index] = minPower;
          remainingPower -= minPower;
        } else {
          // 剩余电力不足最小起充值，设置为0
          newData[device.index] = 0;
        }
      }
    }
  }

  // 如果所有设备都是0，保持原来的值
  if (newData.every(value => value === 0)) {
    return [...data];
  }
  
  return newData;
}

// 从输入框更新图表
function updateChartFromInputs() {
  // 计算新的电力分配
  const newData = calculatePowerAllocation();
  
  // 更新数据
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i];
  }

  // 更新图表
  updateChart();

  // 更新表格中的电力值
  const tbody = document.querySelector('.info-table tbody');
  if (tbody) {
    data.forEach((value, index) => {
      const row = tbody.children[index];
      if (row) {
        const powerCell = row.children[1];
        if (powerCell) {
          powerCell.textContent = value;
        }
      }
    });
  }

  // 更新输入框的placeholder
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach((input, index) => {
    input.value = '';
    input.placeholder = data[index];
  });

  // 更新当前电力显示
  updateCurrentPower();
}

// 在清空数据时也更新表格
function clearAllData() {
  // 将所有数据设置为10
  data.fill(10);
  
  // 更新图表
  myChart.setOption({
    series: [
      {
        type: 'bar',
        data: data
      }
    ]
  });


  // 更新输入框的placeholder
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach(input => {
    input.value = '';
    input.placeholder = '10';
  });

  // 更新当前电力显示
  updateCurrentPower();
}

option = {
  title: {
    text: '设备电力分配',
    left: 'center'
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: stationNames
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: '{value}'
    }
  },
  series: [{
    name: '电力值',
    type: 'bar',
    data: data,
    itemStyle: {
      color: function(params) {
        const status = barStatus[params.dataIndex];
        return status === STATUS.CHARGING ? 
               STATUS_COLORS[status] : 
               TYPE_COLORS[barTypes[params.dataIndex]];
      }
    },
    label: {
      show: true,
      position: 'top'
    }
  }]
};

if (option && typeof option === 'object') {
  myChart.setOption(option);
}

// 初始化输入框placeholder
function initInputPlaceholders() {
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach((input, index) => {
    input.placeholder = data[index];
  });
}

// 初始化当前电力显示
updateCurrentPower();
// 初始化输入框placeholder
initInputPlaceholders();
// 初始化图表显示
updateChart();

window.addEventListener('resize', myChart.resize);