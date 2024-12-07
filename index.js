var dom = document.getElementById('chart-container');
var myChart = echarts.init(dom, null, {
  renderer: 'canvas',
  useDirtyRect: false
});
var app = {};

var option;

// 初始数据
const data = [10, 10, 10, 10, 10, 10];  // 实际分配的电力值
const demandPower = [-1, -1, -1, -1, -1, -1];  // 需求电力值
const stationNames = ['VIP01', 'VIP02', 'HIGH01', 'HIGH02', 'MID01', 'MID02'];

// 状态常量
const STATUS = {
  CHARGING: 1,
  NOT_CHARGING: 0
};

// 状态颜色
const STATUS_COLORS = {
  [STATUS.CHARGING]: '#ff4444',
  [STATUS.NOT_CHARGING]: '#5470c6'
};

// 记录每个柱子的状态
const barStatus = new Array(data.length).fill(STATUS.NOT_CHARGING);

// 类型常量
const STATION_TYPE = {
  VIP: 'VIP',
  HIGH: 'HIGH',
  MID: 'MID'
};
// 类型对应的颜色
const TYPE_COLORS = {
  [STATION_TYPE.VIP]: '#5470c6',   // 蓝色
  [STATION_TYPE.HIGH]: '#5470c6',  // 蓝色
  [STATION_TYPE.MID]: '#5470c6'    // 蓝色
};
// 记录每个柱子的类型
const barTypes = ['VIP', 'VIP', 'HIGH', 'HIGH', 'MID', 'MID'];

// 获取指定类型的设备数量
function getTypeCount(type) {
  return barTypes.filter(t => t === type).length;
}

// 重新生成设备名称
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
  TOTAL_POWER_LIMIT = newLimit;
  document.getElementById('powerLimitDisplay').textContent = newLimit;

  updateAllDisplays();
}

// 从输入框更新图表数据
function updateChartFromInputs() {
  const inputs = document.querySelectorAll('.power-input');
  let hasChanges = false;

  inputs.forEach((input, index) => {
    const value = parseFloat(input.value);
    if (!isNaN(value)) {
      demandPower[index] = value;
      input.value = ''; // 清空输入框
      input.placeholder = value; // 更新 placeholder
      hasChanges = true;
    }
  });

  if (hasChanges) {
    updateAllDisplays();
  }
}

// 更新所有显示和数据的公共方法
function updateAllDisplays() {
  // 重新计算电力分配
  const newData = calculatePowerAllocation();
  
  // 更新数据
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i];
  }

  // 更新图表
  updateChart();

  // 更新表格中的电力值和状态
  const tbody = document.querySelector('.info-table tbody');
  if (tbody) {
    data.forEach((value, index) => {
      const row = tbody.children[index];
      if (row) {
        // 更新分配电力值
        const powerCell = row.children[2];
        if (powerCell) {
          powerCell.textContent = value;
        }
        // 更新需求电力值
        const demandCell = row.children[3];
        if (demandCell) {
          demandCell.textContent = demandPower[index];
        }
        // 更新状态
        const statusCell = row.querySelector('.status-cell');
        if (statusCell) {
          const isCharging = barStatus[index] === STATUS.CHARGING;
          statusCell.textContent = isCharging ? '充电中' : '未充电';
          statusCell.style.color = isCharging ? STATUS_COLORS[STATUS.CHARGING] : STATUS_COLORS[STATUS.NOT_CHARGING];
        }
        // 确保类型选择框保持正确的值
        const typeSelect = row.children[1].querySelector('.type-select');
        if (typeSelect) {
          typeSelect.value = barTypes[index];
        }
      }
    });
  }

  // 更新图表下方输入框的 placeholder
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach((input, index) => {
    input.placeholder = demandPower[index];
  });

  // 更新当前电力显示
  updateCurrentPower();
}

// 确认按钮点击处理
function handleConfirmClick() {
  const deviceSelector = document.getElementById('deviceSelector');
  const demandPowerInput = document.getElementById('demandPowerInput');
  
  const deviceIndex = parseInt(deviceSelector.value);
  const value = parseFloat(demandPowerInput.value);
  
  if (!isNaN(value)) {
    demandPower[deviceIndex] = value;
    demandPowerInput.value = ''; // 清空输入框
    updateAllDisplays();
  }
}

// 初始化表格中的需求电力值显示
function initDemandPowerDisplay() {
  const tbody = document.querySelector('.info-table tbody');
  if (tbody) {
    demandPower.forEach((value, index) => {
      const row = tbody.children[index];
      if (row) {
        const demandCell = row.children[3];
        if (demandCell) {
          demandCell.textContent = value;
        }
      }
    });
  }

  // 初始化图表下方输入框的 placeholder
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach((input, index) => {
    input.placeholder = demandPower[index];
  });
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
    
    // 计算每个设备可分配的电力
    for (const device of priorityDevices) {
      const deviceDemand = demandPower[device.index];
      // 如果设备有特定需求（不为-1），使用需求值和额定电流的较小值
      const targetPower = deviceDemand > 0 ? 
        Math.min(deviceDemand, ratedCurrent) : 
        ratedCurrent;
      
      // 计算实际可分配的电力
      const allocatedPower = Math.min(
        targetPower,
        remainingPower
      );
      
      // 只有当可分配电力大于等于最小启动电力时才分配
      if (allocatedPower >= minPower) {
        newData[device.index] = allocatedPower;
        remainingPower -= allocatedPower;
      }
    }
  }

  // 如果所有设备都是0，保持原来的值
  if (newData.every(value => value === 0)) {
    return [...data];
  }
  
  return newData;
}

// 更新图表
function updateChart() {
  myChart.setOption({
    xAxis: {
      type: 'category',
      data: stationNames
    },
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
          const isCharging = barStatus[params.dataIndex] === STATUS.CHARGING;
          const statusText = isCharging ? '充电中' : '未充电';
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
    barStatus[index] = barStatus[index] === STATUS.CHARGING ? STATUS.NOT_CHARGING : STATUS.CHARGING;
    updateAllDisplays();
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


// 获取指定类型的下一个可用编号
function getNextAvailableNumber(type) {
  // 获取当前所有该类型的设备编号
  const existingNumbers = stationNames
    .filter(name => name.startsWith(type))
    .map(name => parseInt(name.slice(-2)));
  
  // 从01开始查找第一个未使用的编号
  let number = 1;
  while (existingNumbers.includes(number)) {
    number++;
  }
  
  // 返回两位数的字符串格式
  return number.toString().padStart(2, '0');
}

// 更新设备类型
function updateDeviceType(index) {
  const select = document.querySelectorAll('.type-select')[index];
  const newType = select.value;
  const oldType = barTypes[index];
  
  // 更新设备类型
  barTypes[index] = newType;
  
  // 生成新的设备名称
  const newNumber = getNextAvailableNumber(newType);
  const newName = `${newType}${newNumber}`;
  
  // 更新设备名称
  const nameCell = select.parentElement.previousElementSibling;
  nameCell.textContent = newName;
  stationNames[index] = newName;
  
  updateAllDisplays();
}

var option = {
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
        return STATUS_COLORS[barStatus[params.dataIndex]];
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
    input.placeholder = demandPower[index].toString();
  });
}

// 初始化表格中的需求电力值显示
initDemandPowerDisplay();
// 初始化当前电力显示
updateCurrentPower();
// 初始化图表显示
updateChart();
window.addEventListener('resize', myChart.resize);