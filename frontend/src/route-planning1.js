// route-planning.js

  let placeList = [];
  let currentLat = null;
  let currentLng = null;
// 加载地点数据
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(param)
}

async function loadPlaces() {
  // 获取 URL 参数（?mode=external 或 ?mode=internal）
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode') || 'internal' // 默认内部导航

  // 根据 mode 选择 JSON 文件
  const file = mode === 'external' ? 'external-places.json' : 'internal-places.json'

  try {
    const res = await fetch(`../data/${file}`)
    placeList = await res.json()
    console.log(`✅ 加载地点数据: ${file}`, placeList)
  } catch (e) {
    console.error('❌ 无法加载地点数据：', e)
  }
}

function selectMode(mode) {
  // 跳转并携带参数
  window.location.href = `route-planning1.html?mode=${mode}`;
}

// 获取 URL 参数中的 ?mode= 值
function getModeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('mode') || 'internal';  // 默认 internal
}


// 搜索联想
function searchSuggestions(query, type) {
  const input = query.trim().toLowerCase()
  const results = placeList.filter(p =>
    p.name.toLowerCase().includes(input)
  )
  showSuggestions(results, type)
}

// 展示建议列表
function showSuggestions(results, type) {
  const box = document.getElementById(type + 'Suggestions')
  box.innerHTML = ''
  if (!results.length) return

  results.slice(0, 5).forEach(place => {
    const item = document.createElement('div')
    item.textContent = place.name
    item.className = 'suggestion-item'
    item.onclick = () => {
      document.getElementById(type + 'Input').value = place.name
      box.innerHTML = ''
    }
    box.appendChild(item)
  })
}

// 查看导航
async function viewNavigation() {
  const start      = document.getElementById("startInput").value.trim();
  const waypoints  = document.getElementById("waypointsInput").value
                       .split(/[,，]/).map(s => s.trim()).filter(Boolean);
  const mode       = getModeFromURL();   // 你原来的函数

  if (!start || waypoints.length === 0) {
    alert("请至少输入起点和一个景点");
    return;
  }

  try {
    const res = await fetch("/api/generate-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, waypoints, mode })
    });

    const result = await res.json();
    if (result.status === "success") {
      window.location.href = "route-planning2.html";
    } else {
      alert("地图生成失败：" + result.message);
    }
  } catch (err) {
    alert("请求失败：" + err);
  }
}



// 先定义一个全局变量，用来存临时的当前位置


function fallBackToManual() {
  currentLat = null;
  currentLng = null;
  alert("未获取到浏览器定位，请在『当前位置』输入框中手动选择或输入坐标后再搜索附近。");
}

// 页面一加载就尝试获取浏览器定位（权限允许的情况下）
window.addEventListener("load", loadPlaces);       // 先把 JSON 读进来


// 当输入框有文字时，就调用此函数


// ① 用户手动输入或选中地点时把 currentLat/currentLng 设为数值
async function setCurrentPos(text) {
  text = text.trim();
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
    const [lat, lng] = text.split(/,/).map(Number);
    currentLat = lat;
    currentLng = lng;
    document.getElementById("posSuggestions").innerHTML =
      `<div class="suggestion-item">已手动设置坐标 (${lat.toFixed(4)}, ${lng.toFixed(4)})</div>`;
    return;
  }
  // …匹配已有 placeList 的逻辑不变，只要最后赋 currentLat/currentLng 就好…
}

// ② “附近搜索”函数：不再要求 keyword 非空，只要定位到坐标就算
async function searchNearby(keyword) {
  const typeValue = document.getElementById("typeInput").value.trim().toLowerCase();

  if (currentLat === null || currentLng === null) {
    document.getElementById("nearbyResults").innerHTML =
      `<div class="result-item">请先设置“当前位置”</div>`;
    return;
  }

  // —— 从 URL 获取 mode，如果没有，就默认 internal —— 
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "internal";

  const payload = {
    keyword: keyword.trim().toLowerCase(),
    latitude: currentLat,
    longitude: currentLng,
    mode: mode
  };
  if (typeValue) {
    payload.type = typeValue;
  }

  try {
    const res = await fetch("http://localhost:5000/api/search-nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.status === "success") {
      renderNearbyResults(result.data);
    } else {
      document.getElementById("nearbyResults").innerHTML = "";
      console.error("附近搜索失败：", result.message);
    }
  } catch (e) {
    document.getElementById("nearbyResults").innerHTML = "";
    console.error("search-nearby 接口出错：", e);
  }
}


// ③ 渲染下拉列表（同之前逻辑）
function renderNearbySuggestions(items) {
  const box = document.getElementById("nearbySuggestions");
  box.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    box.innerHTML = `<div class="suggestion-item">未找到匹配</div>`;
    return;
  }
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.innerText = `${item.name}（约${Math.round(item.distance)}米）`;
    div.onclick = () => {
      document.getElementById("nearbyInput").value = item.name;
      currentLat = item.lat;
      currentLng = item.lng;
      box.innerHTML = "";
    };
    box.appendChild(div);
  });
}



// 把后端返回的列表渲染到页面上
function renderNearbySuggestions(list) {
  const box = document.getElementById("nearbySuggestions");
  box.innerHTML = ""; // 先清空
  if (!Array.isArray(list) || list.length === 0) {
    box.innerHTML = `<div class="suggestion-item">未找到匹配</div>`;
    return;
  }
  // 假设后端返回的 list 中，每个元素有 { name, distance, lat, lng }
  list.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    // 你可以自定义显示的格式，比如“名称（距离xxx米）”
    div.innerText = `${item.name}（约${Math.round(item.distance)}米）`;
    // 点击后，你可以做更多操作，比如在地图上标记、亦或自动填入起点/终点
    div.onclick = function() {
      // 例：将这个点直接填回终点输入框
      document.getElementById("endInput").value = item.name;
      // 清空建议框
      box.innerHTML = "";
      // 你也可以直接跳转去查看此地点的导航路线等
    };
    box.appendChild(div);
  });
}
async function setCurrentPos(text) {
  text = text.trim();
  // ① 用户直接输入 “lat,lng” 形式
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
    const [lat, lng] = text.split(/,/).map(Number);
    currentLat = lat;
    currentLng = lng;
    document.getElementById("posSuggestions").innerHTML =
      `<div class="suggestion-item">已手动设置坐标 (${lat.toFixed(4)}, ${lng.toFixed(4)})</div>`;
    return;
  }

  // ② 用户输入地点名称，用前端已有的 placeList 做模糊匹配
  const matches = placeList.filter(p =>
    p.name.toLowerCase().includes(text.toLowerCase())
  );

  const box = document.getElementById("posSuggestions");
  box.innerHTML = "";
  matches.slice(0, 5).forEach(p => {
    const d = document.createElement("div");
    d.className = "suggestion-item";
    d.innerText  = p.name;
    d.onclick = () => {
      currentLat = p.lat;
      currentLng = p.lng;
      document.getElementById("posInput").value = p.name;
      box.innerHTML = "";
      console.log("手动选定当前位置 →", p.lat, p.lng);
    };
    box.appendChild(d);
  });
}

async function viewNavigation() {
  const start = document.getElementById("startInput").value.trim();
  const waypoints = document.getElementById("waypointsInput").value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s);
  const end = document.getElementById("endInput").value.trim();

  // —— 从 URL 获取 mode —— 
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "internal";

  if (!start || !end) {
    alert("请输入完整的起点和终点");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/generate-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start,
        waypoints: waypoints.length ? waypoints : null,
        end,
        mode,     // 把 mode 传给后端
      }),
    });

    const result = await res.json();
    if (result.status === "success") {
      window.location.href = "route-planning2.html?mode=" + mode;
    } else {
      alert("地图生成失败：" + result.message);
    }
  } catch (error) {
    alert("请求失败，请检查 Flask 后端是否已运行");
  }
}


  async function loadPlaces() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode") || "internal";
    const file = mode === "external" ? "external-places.json" : "internal-places.json";
    try {
      const res = await fetch(`../data/${file}`);
      placeList = await res.json();
      console.log(`已加载地点列表 (${file})，共 ${placeList.length} 条`);
    } catch (e) {
      console.error(" 无法加载地点列表：", e);
    }
  }

 async function setCurrentPos(text) {
    text = text.trim();
    const box = document.getElementById("posSuggestions");
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) {
      // 如果是经纬度格式，直接解析
      const [lat, lng] = text.split(/,/).map(Number);
      currentLat = lat;
      currentLng = lng;
      box.innerHTML = `<div class="suggestion-item">已手动设置坐标 (${lat.toFixed(4)}, ${lng.toFixed(4)})</div>`;
      // 一旦坐标设置完成，立即触发附近搜索
      searchNearby("");
      return;
    }
    // 否则，执行名称模糊匹配
    const matches = placeList.filter(p =>
      p.name.toLowerCase().includes(text.toLowerCase())
    );
    box.innerHTML = "";
    matches.slice(0, 5).forEach(p => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.innerText = p.name;
      div.onclick = () => {
        currentLat = p.lat;
        currentLng = p.lng;
        document.getElementById("posInput").value = p.name;
        box.innerHTML = "";
        // 一旦选定了某个已有地点，也立刻触发附近搜索
        searchNearby("");
      };
      box.appendChild(div);
    });
  }

   function triggerNearbyOnType() {
    // 只有当 currentLat/currentLng 已设置时才调用 searchNearby
    if (currentLat !== null && currentLng !== null) {
      searchNearby("");
    }
  }

  // “附近搜索”函数：此时 keyword 只靠类别过滤（或者传空字符串让后端返回全部附近）
async function searchNearby(keyword) {
  const typeValue = document.getElementById("typeInput").value.trim().toLowerCase();

  if (currentLat === null || currentLng === null) {
    document.getElementById("nearbyResults").innerHTML =
      `<div class="result-item">请先设置“当前位置”</div>`;
    return;
  }

  // —— 从 URL 获取 mode，如果没有，就默认 internal —— 
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "internal";

  const payload = {
    keyword: keyword.trim().toLowerCase(),
    latitude: currentLat,
    longitude: currentLng,
    mode: mode
  };
  if (typeValue) {
    payload.type = typeValue;
  }

  try {
    const res = await fetch("http://localhost:5000/api/search-nearby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result.status === "success") {
      renderNearbyResults(result.data);
    } else {
      document.getElementById("nearbyResults").innerHTML = "";
      console.error("附近搜索失败：", result.message);
    }
  } catch (e) {
    document.getElementById("nearbyResults").innerHTML = "";
    console.error("search-nearby 接口出错：", e);
  }
}

  // “结果输出”函数：把后端返回的列表渲染到 #nearbyResults 区域
  function renderNearbyResults(items) {
    const box = document.getElementById("nearbyResults");
    box.innerHTML = "";
    if (!Array.isArray(items) || items.length === 0) {
      box.innerHTML = `<div class="result-item">未找到匹配</div>`;
      return;
    }
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.innerText = `${item.name}（约${Math.round(item.distance)}米）`;
      div.onclick = () => {
        // 点击后，仅将名称填回结果区域或做其他操作
        // 这里示例：把名称填回到“类别”框或其它输入框
        // document.getElementById("typeInput").value = item.name;
        // 如果希望选中后把该点设为新的“当前位置”，可取消下面两行注释：
        // currentLat = item.lat;
        // currentLng = item.lng;
        box.innerHTML = "";
      };
      box.appendChild(div);
    });
  }