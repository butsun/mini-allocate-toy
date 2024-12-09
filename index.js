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
  updateDevicePowerDisplay();
}

// 确认按钮点击处理
function handleConfirmClick() {
  // 更新借电策略配置
  const vipBorrowSwitch = document.getElementById('vipBorrowSwitch');
  const highBorrowSwitch = document.getElementById('highBorrowSwitch');
  
  CONFIG.BORROW_POWER.VIP = vipBorrowSwitch.checked;
  CONFIG.BORROW_POWER.HIGH = highBorrowSwitch.checked;

  // 重新计算电力分配
  updateAllDisplays();
}

// 开关状态改变处理
function handleSwitchChange() {
  // 更新借电策略配置
  const vipBorrowSwitch = document.getElementById('vipBorrowSwitch');
  const highBorrowSwitch = document.getElementById('highBorrowSwitch');
  
  CONFIG.BORROW_POWER.VIP = vipBorrowSwitch.checked;
  CONFIG.BORROW_POWER.HIGH = highBorrowSwitch.checked;

  // 重新计算并更新显示
  updateAllDisplays();
}

// 初始化开关状态
function initializeSwitches() {
  const vipBorrowSwitch = document.getElementById('vipBorrowSwitch');
  const highBorrowSwitch = document.getElementById('highBorrowSwitch');
  
  vipBorrowSwitch.checked = CONFIG.BORROW_POWER.VIP;
  highBorrowSwitch.checked = CONFIG.BORROW_POWER.HIGH;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeSwitches();
  // initializeChart();
  // updatePowerAllocation();
});

// 计算设备分配电力
function calculatePowerAllocation() {
  let remainingPower = TOTAL_POWER_LIMIT;
  const newData = new Array(6).fill(0);
  const deviceStates = getDeviceStates();

  // 辅助函数：获取特定类型和状态的设备
  function getDevicesByTypeAndStatus(type, charging) {
    return deviceStates.filter(device => 
      device.type === type && 
      device.charging === charging
    );
  }

  // 辅助函数：分配电力给设备组
  function allocateGroupPowerWithPriority(devices, ratedPower, minPower) {
    if (devices.length === 0) return;
    
    const powerPerDevice = Math.floor(remainingPower / devices.length);

    if (powerPerDevice >= ratedPower) {
      // 如果能达到额定电力，直接分配额定电力
      devices.forEach(device => {
        newData[device.index] = ratedPower;
        remainingPower -= ratedPower;
      });
    } else if (powerPerDevice >= minPower) {
      // 如果能达到最小启动电力，平均分配
      devices.forEach(device => {
        newData[device.index] = powerPerDevice;
        remainingPower -= powerPerDevice;
      });
    } else {
      // 按设备名称降序排序
      const sortedDevices = [...devices].sort((a, b) => 
        stationNames[b.index].localeCompare(stationNames[a.index])
      );
      
      // 逐个分配最小启动电力
      sortedDevices.forEach(device => {
        if (remainingPower >= minPower) {
          newData[device.index] = minPower;
          remainingPower -= minPower;
        } else {
          newData[device.index] = 0;
        }
      });
    }
  }

  // 辅助函数：根据需求电力调整并回收多余电力
  function adjustPowerByDemand(devices) {
    devices.forEach(device => {
      if (newData[device.index] > 0) {  // 只处理已分配电力的设备
        const deviceDemand = demandPower[device.index];
        if (deviceDemand > 0) {  // 如果有具体需求（不为-1）
          if (deviceDemand < newData[device.index]) {
            remainingPower += (newData[device.index] - deviceDemand);
            newData[device.index] = deviceDemand;
          }
        }
      }
    });
  }

  // 1. VIP在充分配
  const chargingVIP = getDevicesByTypeAndStatus('VIP', true);
  if (chargingVIP.length > 0) {
    allocateGroupPowerWithPriority(
      chargingVIP, 
      CONFIG.RATED_CURRENT.VIP, 
      CONFIG.MIN_POWER.VIP
    );
    adjustPowerByDemand(chargingVIP);
  }

  // 2. VIP非在充分配
  const notChargingVIP = getDevicesByTypeAndStatus('VIP', false);
  if (notChargingVIP.length > 0) {
    if (CONFIG.BORROW_POWER.VIP) {
      // 借电策略：必须保证6A最小启动电力
      const minPowerVIP = CONFIG.MIN_POWER.VIP;
      const sortedDevices = [...notChargingVIP].sort((a, b) => 
        stationNames[b.index].localeCompare(stationNames[a.index])
      );
      
      // 逐个保证最小启动电力
      sortedDevices.forEach(device => {
        if (remainingPower >= minPowerVIP) {
          newData[device.index] = minPowerVIP;
          remainingPower -= minPowerVIP;
        } else {
          newData[device.index] = 0;
        }
      });
    } else {
      // 非借电策略下重新尝试分配额定电流
      allocateGroupPowerWithPriority(
        notChargingVIP,
        CONFIG.RATED_CURRENT.VIP,
        CONFIG.MIN_POWER.VIP
      );
      adjustPowerByDemand(notChargingVIP);
    }
  }

  // 3. HIGH在充分配
  const chargingHigh = getDevicesByTypeAndStatus('HIGH', true);
  if (chargingHigh.length > 0) {
      // 6A最小启动电力
      const minPowerHIGH = CONFIG.MIN_POWER.HIGH;
      const sortedDevices = [...chargingHigh].sort((a, b) => 
        stationNames[b.index].localeCompare(stationNames[a.index])
      );
      
      // 逐个保证最小启动电力
      sortedDevices.forEach(device => {
        if (remainingPower >= minPowerHIGH) {
          newData[device.index] = minPowerHIGH;
          remainingPower -= minPowerHIGH;
        } else {
          newData[device.index] = 0;
        }
      });
    // allocateGroupPowerWithPriority(
    //   chargingHigh,
    //   CONFIG.RATED_CURRENT.HIGH,
    //   CONFIG.MIN_POWER.HIGH
    // );
    // adjustPowerByDemand(chargingHigh);
  }

  // 4. HIGH非在充分配
  const notChargingHigh = getDevicesByTypeAndStatus('HIGH', false);
  if (notChargingHigh.length > 0) {
    if (CONFIG.BORROW_POWER.HIGH) {
      // 借电策略：分配0
      notChargingHigh.forEach(device => {
        newData[device.index] = 0;
      });
    } else {
      // 借电策略：必须保证6A最小启动电力
      const minPowerHIGH = CONFIG.MIN_POWER.HIGH;
      const sortedDevices = [...notChargingHigh].sort((a, b) => 
        stationNames[b.index].localeCompare(stationNames[a.index])
      );
      // 逐个保证最小启动电力
      sortedDevices.forEach(device => {
        if (remainingPower >= minPowerHIGH) {
          newData[device.index] = minPowerHIGH;
          remainingPower -= minPowerHIGH;
        } else {
          newData[device.index] = 0;
        }
      });
      // 非借电策略下重新尝试分配额定电流
      // allocateGroupPowerWithPriority(
      //   notChargingHigh,
      //   CONFIG.RATED_CURRENT.HIGH,
      //   CONFIG.MIN_POWER.HIGH
      // );
      // adjustPowerByDemand(notChargingHigh);
    }
  }

  // 5. MID在充分配
  const chargingMid = getDevicesByTypeAndStatus('MID', true);
  if (chargingMid.length > 0) {
      // 6A最小启动电力
      const minPowerMID = CONFIG.MIN_POWER.MID;
      const sortedDevices = [...chargingMid].sort((a, b) => 
        stationNames[b.index].localeCompare(stationNames[a.index])
      );
      // 逐个保证最小启动电力
      sortedDevices.forEach(device => {
        if (remainingPower >= minPowerMID) {
          newData[device.index] = minPowerMID;
          remainingPower -= minPowerMID;
        } else {
          newData[device.index] = 0;
        }
      });
    // allocateGroupPowerWithPriority(
    //   chargingMid,
    //   CONFIG.RATED_CURRENT.MID,
    //   CONFIG.MIN_POWER.MID
    // );
  }


  //high在充重新分配
  if (chargingHigh.length > 0) {
    // 将已分配的电力放回可分配电力中
    chargingHigh.forEach(device => {
      remainingPower += newData[device.index];
      newData[device.index] = 0;
    });

    // 使用allocateGroupPowerWithPriority重新分配
    allocateGroupPowerWithPriority(
      chargingHigh,
      CONFIG.RATED_CURRENT.HIGH,
      CONFIG.MIN_POWER.HIGH
    );
    adjustPowerByDemand(chargingHigh);
 }



  //MID在充重新分配
  if (chargingMid.length > 0) {
    // 将已分配的电力放回可分配电力中
    chargingMid.forEach(device => {
      remainingPower += newData[device.index];
      newData[device.index] = 0;
    });

    // 使用allocateGroupPowerWithPriority重新分配
    allocateGroupPowerWithPriority(
      chargingMid,
      CONFIG.RATED_CURRENT.MID,
      CONFIG.MIN_POWER.MID
    );
    adjustPowerByDemand(chargingMid);
 }




  // 6. 重新分配非在充设备额外电力
  // VIP非在充额外分配（在保持最小启动电力的基础上）
  if (remainingPower > 0 && notChargingVIP.length > 0) {
        // 将已分配的电力放回可分配电力中
        notChargingVIP.forEach(device => {
          remainingPower += newData[device.index];
          newData[device.index] = 0;
        });
    
        // 使用allocateGroupPowerWithPriority重新分配
        allocateGroupPowerWithPriority(
          notChargingVIP,
          CONFIG.RATED_CURRENT.VIP,
          CONFIG.MIN_POWER.VIP
        );
        adjustPowerByDemand(notChargingVIP);
  }

  // HIGH非在充重新分配
  if (remainingPower > 0 && notChargingHigh.length > 0) {
      // 将已分配的电力放回可分配电力中
      notChargingHigh.forEach(device => {
      remainingPower += newData[device.index];
      newData[device.index] = 0;
    });
      allocateGroupPowerWithPriority(
        notChargingHigh,
        CONFIG.RATED_CURRENT.HIGH,
        CONFIG.MIN_POWER.HIGH
      );
      adjustPowerByDemand(notChargingHigh);
  }

  // MID非在充重新分配
  const notChargingMid = getDevicesByTypeAndStatus('MID', false);
  if (remainingPower > 0 && notChargingMid.length > 0) {
    allocateGroupPowerWithPriority(
      notChargingMid,
      CONFIG.RATED_CURRENT.MID,
      CONFIG.MIN_POWER.MID
    );
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
    { type: 'VIP', charging: false },
    { type: 'HIGH', charging: true },
    { type: 'HIGH', charging: false },
    { type: 'MID', charging: true },
    { type: 'MID', charging: false }
  ],
  // 借电策略配置
  BORROW_POWER: {
    VIP: true,  // VIP非充电时是否启用借电（保证最小启动电力）
    HIGH: true   // HIGH非充电时是否启用借电（分配0）
  }
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

// // 更新设备类型
// function updateDeviceType(index) {
//   const select = document.querySelectorAll('.type-select')[index];
//   const newType = select.value;
//   const oldType = barTypes[index];
  
//   // 更新设备类型
//   barTypes[index] = newType;
  
//   // 生成新的设备名称
//   const newNumber = getNextAvailableNumber(newType);
//   const newName = `${newType}${newNumber}`;
  
//   // 更新设备名称
//   const nameCell = select.parentElement.previousElementSibling;
//   nameCell.textContent = newName;
//   stationNames[index] = newName;
  
//   updateAllDisplays();
// }


// 更新设备类型
function updateDeviceType(index,val) {

  // const select = document.querySelectorAll('.type-select')[index];
  const newType = val;
  const oldType = barTypes[index];
  
  // 更新设备类型
  barTypes[index] = newType;
  
  // 生成新的设备名称
  const newNumber = getNextAvailableNumber(newType);
  const newName = `${newType}${newNumber}`;
  
  // 更新设备名称
  // const nameCell = select.parentElement.previousElementSibling;
  // nameCell.textContent = newName;
  stationNames[index] = newName;
  
  // 更新表格中的设备名称显示
  const tbody = document.querySelector('.info-table tbody');
  if (tbody) {
    const row = tbody.children[index];
    if (row) {
      const nameCell = row.querySelector('td:first-child');
      if (nameCell) {
        nameCell.textContent = newName;
      }
    }
  }
  
  updateAllDisplays();
}



// 清空所有需求电力值
function clearAllDemandPower() {
  // 将所有需求电力值设置为-1
  for (let i = 0; i < demandPower.length; i++) {
    demandPower[i] = -1;
  }
  
  // 清空所有输入框
  const inputs = document.querySelectorAll('.power-input');
  inputs.forEach(input => {
    input.value = '';
    input.placeholder = '-1';
  });
  
  // 更新显示
  updateAllDisplays();
}

// 设备配置对象，用于存储每个设备的自定义配置
let deviceConfigs = Array(6).fill(null).map(() => ({
  minPower: 6,
  ratedPower: 32
}));

// 处理最小电力修改
function handleMinPowerChange(deviceIndex, value) {
  const minPower = parseFloat(value);
  if (isNaN(minPower) || minPower < 0) return;
  
  deviceConfigs[deviceIndex].minPower = minPower;
  updateAllDisplays();
}

// 处理额定电力修改
function handleRatedPowerChange(deviceIndex, value) {
  const ratedPower = parseFloat(value);
  if (isNaN(ratedPower) || ratedPower < 0) return;
  
  deviceConfigs[deviceIndex].ratedPower = ratedPower;
  updateAllDisplays();
}

// 获取设备的最小电力
function getDeviceMinPower(deviceIndex) {
  return deviceConfigs[deviceIndex].minPower;
}

// 获取设备的额定电力
function getDeviceRatedPower(deviceIndex) {
  return deviceConfigs[deviceIndex].ratedPower;
}

// 更新设备电力显示
function updateDevicePowerDisplay() {
  const tbody = document.querySelector('.info-table tbody');
  if (!tbody) return;

  for (let i = 0; i < 6; i++) {
    const row = tbody.children[i];
    if (!row) continue;

    // 更新设备名称
    const nameCell = row.querySelector('td:first-child');
    if (nameCell) {
      nameCell.textContent = stationNames[i];
    }

    // 更新电力值
    const minPowerInput = row.querySelector('.min-power-input');
    const ratedPowerInput = row.querySelector('.rated-power-input');
    
    if (minPowerInput) {
      minPowerInput.value = deviceConfigs[i].minPower;
    }
    if (ratedPowerInput) {
      ratedPowerInput.value = deviceConfigs[i].ratedPower;
    }
  }
}

// 初始化设备配置
function initDeviceConfigs() {
  updateDevicePowerDisplay();
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeSwitches();
  initDeviceConfigs();
});

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
    input.placeholder = demandPower[index];
  });
}

// 初始化表格中的需求电力值显示
// initDemandPowerDisplay();
// 初始化当前电力显示
updateCurrentPower();
// 初始化图表显示
updateChart();
window.addEventListener('resize', myChart.resize);