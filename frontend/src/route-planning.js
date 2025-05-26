// route-planning.js

let placeList = []
// 加载地点数据
async function loadPlaces() {
  try {
    const res = await fetch('../data/places.json') // 确保路径正确
    placeList = await res.json()

    // ✅ 加在这里
    console.log('加载的地点数据:', placeList)

  } catch (e) {
    console.error('无法加载地点数据：', e)
  }
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
  const start = document.getElementById("startInput").value.trim();
  const end = document.getElementById("endInput").value.trim();

  if (!start || !end) {
    alert("请输入完整的起点和终点");
    return;
  }

  try {
    // 1. 请求 Flask 后端生成地图
    const res = await fetch('/api/generate-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end })
    });

    const result = await res.json();

    if (result.status === 'success') {
      // ✅ 2. 等待地图生成完成后再跳转
      window.location.href = `route-planning1.html?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    } else {
      alert("地图生成失败：" + result.message);
    }
  } catch (err) {
    alert("请求失败：" + err);
  }
}


window.onload = loadPlaces
