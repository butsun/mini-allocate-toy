var dom = document.getElementById('chart-container');
var myChart = echarts.init(dom, null, {
  renderer: 'canvas',
  useDirtyRect: false
});
var app = {};

var option;

// 初始数据
const data = [10, 10, 10, 10, 10, 10];
// 定义状态常量
const STATUS = {
  CHARGING: 'charging',
  NOT_CHARGING: 'notCharging'
};
// 定义类型常量
const STATION_TYPE = {
  VIP: 'VIP',
  HIGH: 'HIGH',
  MID: 'MID'
};
// 类型对应的颜色
const TYPE_COLORS = {
  [STATION_TYPE.VIP]: '#ffd700',   // 金色
  [STATION_TYPE.HIGH]: '#ff9800',  // 橙色
  [STATION_TYPE.MID]: '#4CAF50'    // 绿色
};
// 记录每个柱子的状态和类型
const barStatus = new Array(data.length).fill(STATUS.NOT_CHARGING);
const barTypes = ['VIP', 'VIP', 'HIGH', 'HIGH', 'MID', 'MID'];
const stationNames = ['VIP01', 'VIP02', 'HIGH01', 'HIGH02', 'MID01', 'MID02'];

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
  
  TOTAL_POWER_LIMIT = newLimit;
  document.getElementById('powerLimitDisplay').textContent = newLimit;
}

// 更新站点类型的函数
function updateStationType(index, newType) {
  const oldType = barTypes[index];
  barTypes[index] = newType;
  
  // 更新下拉框的样式
  const select = document.querySelectorAll('.type-select')[index];
  select.className = 'type-select ' + newType;

  // 重新生成所有站点名称
  regenerateStationNames();
  
  // 更新表格中的站点名称
  const tbody = document.querySelector('.info-table tbody');
  stationNames.forEach((name, idx) => {
    tbody.children[idx].children[0].textContent = name;
  });

  // 更新图表X轴标签
  myChart.setOption({
    xAxis: {
      data: stationNames
    }
  });
  
  // 更新图表颜色
  updateChartColors();
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
function updateTableStatus(index, status) {
  const tbody = document.querySelector('.info-table tbody');
  const statusCell = tbody.children[index].querySelector('.status-cell');
  statusCell.textContent = status === STATUS.CHARGING ? '充电中' : '未充电';
  statusCell.style.color = status === STATUS.CHARGING ? '#ff4444' : '#666';
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
    updateTableStatus(index, barStatus[index]);
    
    // 更新图表
    updateChartColors();
  }
});

// 配置参数
const CONFIG = {
  // 设备类型和充电状态的优先级顺序
  PRIORITY_ORDER: [
    { type: 'VIP', charging: true },   // VIP充电中
    { type: 'VIP', charging: false },  // VIP未充电
    { type: 'HIGH', charging: true },  // HIGH充电中
    { type: 'HIGH', charging: false }, // HIGH未充电
    { type: 'MID', charging: true },   // MID充电中
    { type: 'MID', charging: false }   // MID未充电
  ],
  TYPE_PRIORITY: ['VIP', 'HIGH', 'MID'],
  // 每种类型的最小起充数
  MIN_POWER: {
    VIP: 6,
    HIGH: 6,
    MID: 6
  },
  // 每种类型的额定电流值，默认32
  RATED_CURRENT: {
    VIP: 32,
    HIGH: 32,
    MID: 32
  }
};

// 计算每种类型的分配率
function calculateTypeRates(types) {
  // 统计每种类型的设备数量
  const typeCounts = {
    VIP: types.filter(t => t === 'VIP').length,
    HIGH: types.filter(t => t === 'HIGH').length,
    MID: types.filter(t => t === 'MID').length
  };

  // 计算每种类型的总额定电流
  const typeCurrents = {
    VIP: typeCounts.VIP * CONFIG.RATED_CURRENT.VIP,
    HIGH: typeCounts.HIGH * CONFIG.RATED_CURRENT.HIGH,
    MID: typeCounts.MID * CONFIG.RATED_CURRENT.MID
  };

  // 计算总额定电流
  const totalCurrent = typeCurrents.VIP + typeCurrents.HIGH + typeCurrents.MID;

  // 计算每种类型的分配率
  return {
    VIP: totalCurrent ? typeCurrents.VIP / totalCurrent : 0,
    HIGH: totalCurrent ? typeCurrents.HIGH / totalCurrent : 0,
    MID: totalCurrent ? typeCurrents.MID / totalCurrent : 0
  };
}

// 获取设备当前状态
function getDeviceStates() {
  const types = Array.from(document.querySelectorAll('.type-select')).map(select => select.value);
  const statusCells = document.querySelectorAll('.status-cell');
  const states = types.map((type, index) => ({
    index,
    type,
    charging: statusCells[index].textContent === '充电中'
  }));
  return states;
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
      priorityDevices.forEach((device, index) => {
        newData[device.index] = powerPerDevice;
        remainingPower -= newData[device.index];
      });
    } else {
      // 当平均值小于最小起充数时，按设备名称排序逐一分配最小起充值
      const sortedDevices = [...priorityDevices].sort((a, b) => {
        const nameA = document.querySelector(`.info-table tbody tr:nth-child(${a.index + 1}) td:first-child`).textContent;
        const nameB = document.querySelector(`.info-table tbody tr:nth-child(${b.index + 1}) td:first-child`).textContent;
        return nameA.localeCompare(nameB);
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
  
  return newData;
}

// 更新图表数据的函数
function updateChartFromInputs() {
  // 计算新的电力分配
  const newData = calculatePowerAllocation();
  
  // 更新数据数组
  data.length = 0;
  newData.forEach(val => data.push(val));
  
  // 计算数据最大值，向上取整到10的倍数
  const maxValue = Math.max(...data);
  const yAxisMax = Math.ceil(maxValue / 10) * 10;
  
  // 更新图表
  myChart.setOption({
    yAxis: {
      type: 'value',
      name: '电力值',
      max: yAxisMax,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        type: 'bar',
        data
      }
    ]
  });

  // 更新表格中的电力值
  updateTablePowerValues();

  // 更新输入框的placeholder
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach((input, index) => {
    input.value = '';
    input.placeholder = data[index];
  });

  // 更新当前电力显示
  updateCurrentPower();
}

// 更新表格中的电力值
function updateTablePowerValues() {
  const powerCells = document.querySelectorAll('.power-value');
  data.forEach((value, index) => {
    powerCells[index].textContent = value;
  });
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
        data
      }
    ]
  });

  // 更新表格中的电力值
  updateTablePowerValues();

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

// 修改图表时更新表格
myChart.on('finished', function() {
  updateTablePowerValues();
});

window.addEventListener('resize', myChart.resize);