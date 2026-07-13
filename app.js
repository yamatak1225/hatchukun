// --- データストレージ構成 ---
let itemMaster = JSON.parse(localStorage.getItem("spd_i_master") || "{}");
let deptMaster = JSON.parse(localStorage.getItem("spd_d_master") || "{}");
let vendorMaster = JSON.parse(localStorage.getItem("spd_v_master") || "{}");
let facilityInfo = JSON.parse(localStorage.getItem("spd_f_info") || '{"name":"","zip":"","addr":"","tel":"","fax":"","dept":"","user":""}');
let consumeLogs = JSON.parse(localStorage.getItem("spd_c_logs") || "[]");
let poHistory = JSON.parse(localStorage.getItem("spd_po_history") || "[]");
let printQueue = [];
let currentSearchMode = "master";

window.addEventListener("DOMContentLoaded", () => {
  renderItemTable();
  renderDeptTable();
  renderVendorTable();
  loadFacilityForm();
  updateSelectOptions();
  renderLogTable();
  renderPrintGrid();

  const scanner = document.getElementById("barcodeScanner");
  
  const cleanAndProcessInput = () => {
    let rawValue = scanner.value;
    if(!rawValue) return;
    
    let cleaned = rawValue.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    
    const kanaMap = {
      'ー': '-', '。': '.', '＿': '_', '＊': '*', 'ほ': '-', 'る': '.', 'ろ': '_', 'け': ':', 'せ': ';',
      'た':'A','て':'B','い':'C','す':'D','か':'E','ん':'F','な':'G','に':'H','ら':'I','ま':'J',
      'の':'K','お':'L','は':'M','き':'N','く':'O','ま':'P','ち':'Q','と':'R','し':'S','は':'T',
      'ひ':'U','こ':'V','み':'W','も':'X','ね':'Y','る':'Z'
    };
    for(let k in kanaMap) {
      cleaned = cleaned.replaceAll(k, kanaMap[k]);
    }
    
    cleaned = cleaned.replace(/[^A-Za-z0-9.\-$ /+%]/g, "").trim().toUpperCase();
    
    if (cleaned) {
      processCardScan(cleaned);
    }
    scanner.value = "";
  };

  scanner.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      cleanAndProcessInput();
    }
  });

  scanner.addEventListener("blur", () => {
    if(scanner.value.trim() !== "") {
      cleanAndProcessInput();
    }
  });
  
  document.body.addEventListener("click", (e) => {
    const isInputFocused = ["INPUT", "SELECT", "OPTION", "TEXTAREA"].includes(e.target.tagName);
    const isModalOpen = document.getElementById("masterModal").style.display === "flex" || 
                       document.getElementById("orderModal").style.display === "flex" ||
                       document.getElementById("importModal").style.display === "flex" ||
                       document.getElementById("searchModal").style.display === "flex";
    if (!isInputFocused && e.target.id !== "barcodeScanner" && !isModalOpen) {
      setTimeout(() => scanner.focus(), 50);
    }
  });
  setTimeout(() => scanner.focus(), 200);
});

// 汎用データ保存用
function saveAllState() {
  localStorage.setItem("spd_i_master", JSON.stringify(itemMaster));
  localStorage.setItem("spd_d_master", JSON.stringify(deptMaster));
  localStorage.setItem("spd_v_master", JSON.stringify(vendorMaster));
  localStorage.setItem("spd_c_logs", JSON.stringify(consumeLogs));
  localStorage.setItem("spd_po_history", JSON.stringify(poHistory));
}

// 文字列を半角・小文字化、全角カナを半角カナに正規化する関数
function normalizeText(str) {
  if (!str) return "";
  let res = str.replace(/[Ａ-Ｚａ-ｚ０-９ ]/g, (s) => {
    if(s === " ") return " ";
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  }).toLowerCase();
  
  const zen = [
    "ガ", "ギ", "グ", "ゲ", "ゴ", "ザ", "ジ", "ズ", "ゼ", "ゾ", "ダ", "ヂ", "ヅ", "デ", "ド", "バ", "ビ", "ブ", "ベ", "ボ", "パ", "ピ", "プ", "ペ", "ポ",
    "ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク", "ケ", "コ", "サ", "シ", "ス", "セ", "ソ", "タ", "チ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ",
    "ハ", "ヒ", "フ", "ヘ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン", "ッ", "ャ", "ュ", "ョ", "ー"
  ];
  const han = [
    "ｶﾞ", "ｷﾞ", "ｸﾞ", "ｹﾞ", "ｺﾞ", "ｻﾞ", "ｼﾞ", "ｽﾞ", "ｾﾞ", "ｿﾞ", "ﾀﾞ", "ﾁﾞ", "ﾂﾞ", "ﾃﾞ", "ﾄﾞ", "ﾊﾞ", "ﾋﾞ", "ﾌﾞ", "ﾍﾞ", "ﾎﾞ", "ﾊﾟ", "ﾋﾟ", "ﾌﾟ", "ﾍﾟ", "ﾎﾟ",
    "ｱ", "ｲ", "ｳ", "ｴ", "ｵ", "ｶ", "ｷ", "ｸ", "ｹ", "ｺ", "ｻ", "ｼ", "ｽ", "ｾ", "ｿ", "ﾀ", "ﾁ", "ツ", "テ", "ト", "ナ", "ニ", "ヌ", "ネ", "ノ",
    "ハ", "ヒ", "フ", "ヘ", "ホ", "マ", "ミ", "ム", "メ", "モ", "ヤ", "ユ", "ヨ", "ラ", "リ", "ル", "レ", "ロ", "ワ", "ヲ", "ン", "ッ", "ャ", "ュ", "ョ", "ー"
  ];
  for (let i = 0; i < zen.length; i++) {
    res = res.replaceAll(zen[i], han[i]);
  }
  return res;
}

// 「半角/全角」「大文字/小文字」不問の複数条件あいまい検索
function openSearchModal(mode) {
  currentSearchMode = mode;
  const title = document.getElementById("searchModalTitle");
  if(mode === 'master') {
    title.innerText = "🔍 商品マスタ検索・編集（スペース区切り・全半角不問）";
  } else {
    title.innerText = "🔍 商品クイック検索（選択でリスト・入力エリアに反映）";
  }
  document.getElementById("modalSearchInput").value = "";
  executeProductSearch();
  openModal('searchModal');
  setTimeout(() => document.getElementById("modalSearchInput").focus(), 150);
}

function executeProductSearch() {
  const tbody = document.getElementById("modalSearchTableBody");
  const keywordInput = document.getElementById("modalSearchInput").value.trim();
  tbody.innerHTML = "";
  
  const normInput = normalizeText(keywordInput);
  const keywords = normInput ? normInput.split(/\s+/) : [];
  
  Object.keys(itemMaster).forEach(jan => {
    const item = itemMaster[jan];
    const vendorName = vendorMaster[item.vCode] ? vendorMaster[item.vCode].name : item.vCode;
    
    const rawMatchText = `${jan} ${item.maker || ''} ${item.name} ${item.spec || ''} ${vendorName}`;
    const normMatchText = normalizeText(rawMatchText);
    
    const isMatch = keywords.every(kw => normMatchText.includes(kw));
    
    if (isMatch) {
      const tr = document.createElement("tr");
      let actionButtons = "";
      if(currentSearchMode === 'master') {
        actionButtons = `
          <button class="btn btn-primary btn-xs" onclick="selectItemToForm('${jan}')">選択</button>
          <button class="btn btn-danger btn-xs" onclick="deleteItemDirect('${jan}')">削除</button>
        `;
      } else {
        actionButtons = `
          <button class="btn btn-success btn-xs" onclick="selectItemToCardQueue('${jan}')">商品選択</button>
        `;
      }

      tr.innerHTML = `
        <td><code>${jan}</code></td>
        <td><small>${vendorName}</small></td>
        <td>${item.maker || '-'}</td>
        <td><b>${item.name}</b></td>
        <td><small>${item.spec || '-'}</small></td>
        <td>${item.unit}</td>
        <td>${actionButtons}</td>
      `;
      tbody.appendChild(tr);
    }
  });

  if(tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#95a5a6; padding:15px;">条件に合致する商品は見つかりません。</td></tr>`;
  }
}

function selectItemToForm(jan) {
  const item = itemMaster[jan];
  if(!item) return;
  document.getElementById("i_jan").value = jan;
  document.getElementById("i_vendor").value = item.vCode;
  document.getElementById("i_maker").value = item.maker;
  document.getElementById("i_name").value = item.name;
  document.getElementById("i_spec").value = item.spec;
  document.getElementById("i_unit").value = item.unit;
  closeModal('searchModal');
  document.getElementById("i_name").focus();
}

function deleteItemDirect(jan) {
  if(confirm(`JAN: ${jan}\nこの商品をマスタから削除しますか？`)) {
    delete itemMaster[jan];
    saveAllState();
    renderItemTable();
    updateSelectOptions();
    executeProductSearch();
  }
}

// カード印刷キューへの登録
function selectItemToCardQueue(jan) {
  document.getElementById("print_item_select").value = jan;
  closeModal('searchModal');
}

// --- 📥 データ一括インポート処理 ---
function processItemImport() {
  const rawText = document.getElementById("importItemText").value.trim();
  if(!rawText) { alert("テキストエリアにデータが入力されていません。"); return; }
  
  const lines = rawText.split(/\r?\n/);
  let successCount = 0;
  let skipCount = 0;
  let errorLog = [];

  lines.forEach((line, index) => {
    if(!line.trim()) return;
    let tokens = line.split(/\t|,/);
    tokens = tokens.map(t => t.trim().replace(/^"|"$/g, ''));
    
    if(tokens.length < 4) {
      errorLog.push(`${index + 1}行目: 列数が足りません(JAN,業者,メーカー,商品名は必須)`);
      skipCount++;
      return;
    }
    
    const jan = tokens[0];
    const vCode = tokens[1].toUpperCase();
    const maker = tokens[2] || "";
    const name = tokens[3];
    const spec = tokens[4] || "";
    const unit = tokens[5] || "箱";
    
    if(!jan || !name) {
      errorLog.push(`${index + 1}行目: JANコードまたは商品名が空です`);
      skipCount++;
      return;
    }
    
    if(!vendorMaster[vCode]) {
      errorLog.push(`${index + 1}行目: 警告 - 業者コード [${vCode}] は業者マスタに未登録です。`);
    }
    
    itemMaster[jan] = { vCode, maker, name, spec, unit };
    successCount++;
  });
  
  saveAllState();
  renderItemTable();
  updateSelectOptions();
  
  let msg = `商品マスタのインポートが完了しました。\n登録・更新成功: ${successCount} 件\nスキップ: ${skipCount} 件`;
  if(errorLog.length > 0) {
    msg += `\n\n【詳細・警告】\n` + errorLog.slice(0, 10).join("\n");
  }
  alert(msg);
  document.getElementById("importItemText").value = "";
}

function processCardImport() {
  const rawText = document.getElementById("importCardText").value.trim();
  if(!rawText) { alert("テキストエリアにデータが入力されていません。"); return; }
  
  const lines = rawText.split(/\r?\n/);
  let successCount = 0;
  let skipCount = 0;
  let errorLog = [];

  lines.forEach((line, index) => {
    if(!line.trim()) return;
    let tokens = line.split(/\t|,/);
    tokens = tokens.map(t => t.trim().replace(/^"|"$/g, ''));
    
    if(tokens.length < 2) {
      errorLog.push(`${index + 1}行目: 列数が足りません(部署コード, JANコードが必要です)`);
      skipCount++;
      return;
    }
    
    const dCode = tokens[0].toUpperCase();
    const jan = tokens[1];
    
    if(!deptMaster[dCode]) {
      errorLog.push(`${index + 1}行目: 部署コード [${dCode}] が部署マスタにありません`);
      skipCount++;
      return;
    }
    if(!itemMaster[jan]) {
      errorLog.push(`${index + 1}行目: JANコード [${jan}] が商品マスタにありません`);
      skipCount++;
      return;
    }
    
    printQueue.push({ dCode, jan });
    successCount++;
  });
  
  renderPrintGrid();
  
  let msg = `発行カード印刷リストへの追加が完了しました。\n追加成功: ${successCount} 枚\nスキップ: ${skipCount} 件`;
  if(errorLog.length > 0) {
    msg += `\n\n【エラー詳細】\n` + errorLog.slice(0, 10).join("\n");
  }
  alert(msg);
  document.getElementById("importCardText").value = "";
}

// --- モーダル制御表示 ---
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; setTimeout(() => document.getElementById("barcodeScanner").focus(), 100); }
function closeModalOnOverlay(e, id) { if(e.target.id === id) closeModal(id); }

// --- 施設情報制御 ---
function loadFacilityForm() {
  for(let key in facilityInfo) {
    const el = document.getElementById(`f_${key}`);
    if(el) el.value = facilityInfo[key];
  }
}
function saveFacility(e) {
  e.preventDefault();
  for(let key in facilityInfo) {
    facilityInfo[key] = document.getElementById(`f_${key}`).value.trim();
  }
  localStorage.setItem("spd_f_info", JSON.stringify(facilityInfo));
  alert("施設情報を保存しました。");
}

// --- 業者マスタ制御 ---
function saveVendor(e) {
  e.preventDefault();
  const code = document.getElementById("v_code").value.trim().toUpperCase();
  const name = document.getElementById("v_name").value.trim();
  if(!/^[A-Z0-9.\-$ /+%]+$/.test(code)) { alert("業者コードには半角英数字、記号のみ使用できます。"); return; }
  vendorMaster[code] = { name };
  saveAllState();
  renderVendorTable();
  updateSelectOptions();
  document.getElementById("vendorForm").reset();
}
function renderVendorTable() {
  const tbody = document.getElementById("vendorTableBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  Object.keys(vendorMaster).forEach(code => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><code>${code}</code></td><td><b>${vendorMaster[code].name}</b></td>
      <td><button class="btn btn-danger" style="padding:1px 5px; font-size:10px;" onclick="deleteVendor('${code}')">削除</button></td>`;
    tbody.appendChild(tr);
  });
}
function deleteVendor(code) {
  if(confirm("この業者を削除しますか？")) {
    delete vendorMaster[code]; saveAllState(); renderVendorTable(); updateSelectOptions();
  }
}

// --- 商品・部署マスタ制御 ---
function saveItem(e) {
  e.preventDefault();
  const jan = document.getElementById("i_jan").value.trim();
  const vCode = document.getElementById("i_vendor").value;
  const maker = document.getElementById("i_maker").value.trim();
  const name = document.getElementById("i_name").value.trim();
  const spec = document.getElementById("i_spec").value.trim();
  const unit = document.getElementById("i_unit").value.trim() || "箱";
  
  if(!vCode) { alert("業者を選択してください。"); return; }
  itemMaster[jan] = { vCode, maker, name, spec, unit };
  saveAllState();
  renderItemTable();
  updateSelectOptions();
  document.getElementById("itemForm").reset();
  document.getElementById("i_unit").value = "箱";
}
function renderItemTable() {
  const tbody = document.getElementById("itemTableBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  const keys = Object.keys(itemMaster);
  document.getElementById("itemCount").innerText = `${keys.length}件`;
  
  const displayKeys = keys.slice(-15).reverse();
  displayKeys.forEach(jan => {
    const it = itemMaster[jan];
    const vName = vendorMaster[it.vCode] ? vendorMaster[it.vCode].name : `未登録(${it.vCode})`;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><b>${jan}</b></td><td><small>${vName}</small></td><td>${it.maker}</td><td>${it.name} ${it.spec}</td>
      <td><button class="btn btn-danger" style="padding:1px 5px; font-size:10px;" onclick="deleteItem('${jan}')">削除</button></td>`;
    tbody.appendChild(tr);
  });
}
function deleteItem(jan) { if(confirm("削除しますか？")) { delete itemMaster[jan]; saveAllState(); renderItemTable(); updateSelectOptions(); } }

function saveDept(e) {
  e.preventDefault();
  const code = document.getElementById("d_code").value.trim().toUpperCase();
  const name = document.getElementById("d_name").value.trim();
  if(!/^[A-Z0-9.\-$ /+%]+$/.test(code)) { alert("部署コードには半角英数字、記号のみ使用できます。"); return; }
  deptMaster[code] = { name };
  saveAllState();
  renderDeptTable();
  updateSelectOptions();
  document.getElementById("deptForm").reset();
}
function renderDeptTable() {
  const tbody = document.getElementById("deptTableBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  const keys = Object.keys(deptMaster);
  document.getElementById("deptCount").innerText = `${keys.length}件`;
  keys.forEach(code => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><code>${code}</code></td><td><b>${deptMaster[code].name}</b></td>
      <td><button class="btn btn-danger" style="padding:1px 5px; font-size:10px;" onclick="deleteDept('${code}')">削除</button></td>`;
    tbody.appendChild(tr);
  });
}
function deleteDept(code) { if(confirm("削除しますか？")) { delete deptMaster[code]; saveAllState(); renderDeptTable(); updateSelectOptions(); } }

function updateSelectOptions() {
  const dSel = document.getElementById("print_dept_select");
  const iSel = document.getElementById("print_item_select");
  const vSel = document.getElementById("i_vendor");
  
  if(!dSel || !iSel || !vSel) return;
  
  dSel.innerHTML = ""; iSel.innerHTML = ""; 
  vSel.innerHTML = '<option value="">-- 業者を選択 --</option>';
  
  Object.keys(vendorMaster).forEach(c => { vSel.innerHTML += `<option value="${c}">${vendorMaster[c].name} (${c})</option>`; });
  Object.keys(deptMaster).forEach(c => { dSel.innerHTML += `<option value="${c}">${deptMaster[c].name} (${c})</option>`; });
  
  Object.keys(itemMaster).forEach(j => { 
    const item = itemMaster[j];
    const specStr = item.spec ? ` 規格:${item.spec}` : "";
    const makerStr = item.maker ? ` (${item.maker})` : "";
    iSel.innerHTML += `<option value="${j}">${item.name}${specStr}${makerStr}</option>`; 
  });
}

// --- 発注カード生成ロジック ---
function addCardToPrint() {
  const dCode = document.getElementById("print_dept_select").value;
  const jan = document.getElementById("print_item_select").value;
  if(!dCode || !jan) { alert("部署と商品を選択してください。"); return; }
  printQueue.push({ dCode, jan });
  renderPrintGrid();
}

function directConsumeWithoutCard() {
  const dCode = document.getElementById("print_dept_select").value;
  const jan = document.getElementById("print_item_select").value;
  
  if(!dCode || !jan) { alert("部署と商品を選択してください。"); return; }
  
  const dept = deptMaster[dCode];
  const item = itemMaster[jan];
  
  if(!dept || !item) { alert("選択された部署または商品のマスタが見つかりません。"); return; }
  
  const now = new Date();
  const timeStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  
  consumeLogs.unshift({
    id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    time: timeStr,
    deptCode: dCode,
    deptName: dept.name,
    jan: jan,
    vCode: item.vCode,
    maker: item.maker,
    itemName: item.name,
    itemSpec: item.spec,
    qty: 1,
    unit: item.unit,
    isOrdered: false
  });
  
  saveAllState();
  renderLogTable();
  
  const alertBox = document.getElementById("alertBox");
  alertBox.className = "alert-box alert-ok";
  alertBox.innerText = `📋 直接発注(手入力): 【${dept.name}】 ${item.name} を実績に追加しました`;
  alertBox.style.display = "block";
}

function clearPrintList() { printQueue = []; renderPrintGrid(); }
function renderPrintGrid() {
  const pGrid = document.getElementById("previewGrid");
  const aGrid = document.getElementById("actualPrintGrid");
  if(!pGrid || !aGrid) return;
  pGrid.innerHTML = ""; aGrid.innerHTML = "";
  document.getElementById("cardCount").innerText = printQueue.length;
  
  printQueue.forEach((cData, idx) => {
    const dept = deptMaster[cData.dCode];
    const item = itemMaster[cData.jan];
    if(!dept || !item) return;
    
    const vendorName = vendorMaster[item.vCode] ? vendorMaster[item.vCode].name : `未登録(${item.vCode})`;
    const barcodeValue = `${cData.dCode}${cData.jan}`;
    const svgHtml = generateCode39Svg(barcodeValue);
    
    const cardHtml = `
      <div class="order-card">
        <div class="card-dept">${dept.name}</div>
        <div class="card-details">
          <div><b>発注先:</b> ${vendorName}</div>
          <div><b>メーカー:</b> ${item.maker || '-'}</div>
          <div><b>商品名:</b> ${item.name}</div>
          <div><b>規格:</b> ${item.spec || '-'}</div>
          <div><b>JANコード:</b> ${cData.jan}</div>
        </div>
        <div class="card-qty">数量：1 ${item.unit}</div>
        <div class="card-barcode-zone">
          ${svgHtml}
          <div class="barcode-text">*${barcodeValue}*</div>
        </div>
        <button class="btn btn-danger no-print" style="position:absolute; top:2px; right:2px; padding:1px 4px; font-size:9px;" onclick="removeCardFromQueue(${idx}); event.stopPropagation();">X</button>
      </div>
    `;
    pGrid.innerHTML += cardHtml;
    aGrid.innerHTML += cardHtml;
  });
}
function removeCardFromQueue(idx) { printQueue.splice(idx, 1); renderPrintGrid(); }

// --- バーコード連続スキャン（消費登録）処理 ---
function processCardScan(scannedValue) {
  if(!scannedValue) return;
  let foundDeptCode = "";
  let foundJan = "";
  
  const dCodes = Object.keys(deptMaster);
  for(let code of dCodes) {
    if(scannedValue.startsWith(code)) {
      foundDeptCode = code;
      foundJan = scannedValue.substring(code.length);
      break;
    }
  }
  
  const alertBox = document.getElementById("alertBox");
  if(!foundDeptCode || !itemMaster[foundJan]) {
    alertBox.className = "alert-box alert-ng";
    alertBox.innerText = `⚠️ 読取エラー: 該当するマスタがありません。 (値: ${scannedValue})`;
    alertBox.style.display = "block";
    return;
  }
  
  const dept = deptMaster[foundDeptCode];
  const item = itemMaster[foundJan];
  
  const now = new Date();
  const timeStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  
  consumeLogs.unshift({
    id: "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    time: timeStr,
    deptCode: foundDeptCode,
    deptName: dept.name,
    jan: foundJan,
    vCode: item.vCode,
    maker: item.maker,
    itemName: item.name,
    itemSpec: item.spec,
    qty: 1,
    unit: item.unit,
    isOrdered: false
  });
  
  saveAllState();
  renderLogTable();
  
  alertBox.className = "alert-box alert-ok";
  alertBox.innerText = `✅ 登録完了: 【${dept.name}】 ${item.name} (1 ${item.unit})`;
  alertBox.style.display = "block";
}

function renderLogTable() {
  const tbody = document.getElementById("logTableBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  consumeLogs.forEach((log, idx) => {
    const tr = document.createElement("tr");
    const statusStr = log.isOrdered ? `<span style="color:green;">✔ 発注済</span>` : `<span style="color:#e67e22; font-weight:bold;">未発注</span>`;
    tr.innerHTML = `<td>${log.time}</td><td><b>${log.deptName}</b></td>
      <td><b>${log.itemName} ${log.itemSpec || ''}</b><br><small style="color:#7f8c8d;">${log.maker || '-'}</small></td>
      <td><span style="color:#e67e22; font-weight:bold;">${log.qty} ${log.unit}</span></td><td>${statusStr}</td>
      <td><button class="btn btn-danger" style="padding:1px 5px; font-size:10px;" onclick="deleteLog(${idx})">取消</button></td>`;
    tbody.appendChild(tr);
  });
}
function deleteLog(idx) { consumeLogs.splice(idx, 1); saveAllState(); renderLogTable(); if(document.getElementById("orderModal").style.display === "flex") refreshOrderDashboard(); }
function clearLogs() { if(confirm("実績履歴をすべてクリアしますか？")) { consumeLogs = []; saveAllState(); renderLogTable(); if(document.getElementById("orderModal").style.display === "flex") refreshOrderDashboard(); } }

// --- 発注書ロジック・集計システム ---
function getUnprintedGroupedData() {
  let unprintedLogs = consumeLogs.filter(l => !l.isOrdered);
  let groups = {};
  
  unprintedLogs.forEach(log => {
    let key = `${log.vCode}_${log.jan}_${log.deptCode}`;
    if(!groups[key]) {
      groups[key] = {
        vCode: log.vCode,
        jan: log.jan,
        deptCode: log.deptCode,
        deptName: log.deptName,
        maker: log.maker,
        itemName: log.itemName,
        itemSpec: log.itemSpec,
        unit: log.unit,
        qty: 0,
        rawLogIds: []
      };
    }
    groups[key].qty += log.qty;
    groups[key].rawLogIds.push(log.id);
  });
  return Object.values(groups);
}

function refreshOrderDashboard() {
  const tbody = document.getElementById("unprintedOrderBody");
  if(!tbody) return;
  tbody.innerHTML = "";
  let grouped = getUnprintedGroupedData();
  
  if(grouped.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#95a5a6; padding:20px;">未発注のデータはありません。</td></tr>`;
  } else {
    grouped.forEach(g => {
      const vName = vendorMaster[g.vCode] ? vendorMaster[g.vCode].name : g.vCode;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${vName}</td><td>${g.maker || '-'}</td><td><b>${g.itemName} ${g.itemSpec || ''}</b></td>
        <td style="color:#e67e22; font-weight:bold;">${g.qty} ${g.unit}</td><td><mark>${g.deptName}</mark></td>`;
      tbody.appendChild(tr);
    });
  }
  
  const hBody = document.getElementById("orderHistoryBody");
  if(!hBody) return;
  hBody.innerHTML = "";
  if(poHistory.length === 0) {
    hBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#95a5a6; padding:15px;">発行履歴はありません。</td></tr>`;
  } else {
    poHistory.forEach((h, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${h.date}</td><td><code>${h.poNumber}</code></td><td><b>${h.vendorName}</b></td><td>${h.items.length}品目</td>
        <td>
          <button class="btn btn-success" style="padding:2px 6px; font-size:11px;" onclick="printOldPO(${idx})">🖨️ 再発行</button>
          <button class="btn btn-danger" style="padding:2px 6px; font-size:11px;" onclick="deletePoHistory(${idx})">削除</button>
        </td>`;
      hBody.appendChild(tr);
    });
  }
}

function generatePurchaseOrders() {
  let grouped = getUnprintedGroupedData();
  if(grouped.length === 0) { alert("発注対象の未発行データがありません。"); return; }
  
  let vendorOrders = {};
  grouped.forEach(g => {
    if(!vendorOrders[g.vCode]) vendorOrders[g.vCode] = [];
    vendorOrders[g.vCode].push(g);
  });
  
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  
  let newHistoryRecords = [];
  
  Object.keys(vendorOrders).forEach((vCode) => {
    let maxSeq = 0;
    const prefix = `${ymd}-${vCode}-`;
    
    poHistory.forEach(h => {
      if (h.poNumber && h.poNumber.startsWith(prefix)) {
        const seqPart = h.poNumber.replace(prefix, "");
        const seq = parseInt(seqPart, 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    
    const nextSeq = maxSeq + 1;
    const poNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    
    const vName = vendorMaster[vCode] ? vendorMaster[vCode].name : "不明な業者";
    
    let poItems = vendorOrders[vCode].map(item => ({
      maker: item.maker,
      itemName: item.itemName,
      itemSpec: item.itemSpec,
      qty: item.qty,
      unit: item.unit,
      deptName: item.deptName
    }));
    
    newHistoryRecords.push({
      poNumber: poNumber,
      date: `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
      vendorName: vName,
      items: poItems
    });
    
    let allLogIds = [];
    vendorOrders[vCode].forEach(g => { allLogIds = allLogIds.concat(g.rawLogIds); });
    consumeLogs.forEach(log => {
      if(allLogIds.includes(log.id)) log.isOrdered = true;
    });
  });
  
  poHistory = newHistoryRecords.concat(poHistory);
  saveAllState();
  
  renderLogTable();
  refreshOrderDashboard();
  
  renderPoPrintView(newHistoryRecords);
  window.print();
}

function renderPoPrintView(poList) {
  const grid = document.getElementById("actualPoPrintGrid");
  if(!grid) return;
  grid.innerHTML = ""; 
  document.getElementById("actualPrintGrid").innerHTML = "";
  
  poList.forEach(po => {
    let rowsHtml = "";
    po.items.forEach((item, index) => {
      rowsHtml += `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td>${item.maker || '-'}</td>
          <td><b>${item.itemName}</b></td>
          <td>${item.itemSpec || '-'}</td>
          <td style="text-align:right; font-weight:bold;">${item.qty}</td>
          <td style="text-align:center;">${item.unit}</td>
          <td>${item.deptName}</td>
        </tr>
      `;
    });
    
    const pageHtml = `
      <div class="po-print-page">
        <div class="po-header">
          <div>
            <strong style="font-size:16px;">発注先御中：</strong><br>
            <span style="font-size:20px; font-weight:bold; border-bottom:1px solid #000; padding-right:30px;">${po.vendorName}</span>
          </div>
          <div style="text-align: right; font-size:12px; line-height:1.4;">
            <div>発注番号: ${po.poNumber}</div>
            <div>発注日時: ${po.date}</div>
            <div style="margin-top:5px; font-weight:bold; font-size:14px;">${facilityInfo.name || '(施設名未設定)'}</div>
            <div>〒${facilityInfo.zip || '---'}</div>
            <div>${facilityInfo.addr || ''}</div>
            <div>TEL: ${facilityInfo.tel || ''} / FAX: ${facilityInfo.fax || ''}</div>
            <div>部署: ${facilityInfo.dept || ''} / 担当: ${facilityInfo.user || ''}</div>
          </div>
        </div>
        
        <div class="po-title">物 品 発 注 書</div>
        <p>下記の通り、物品を発注いたします。納期等のご確認をお願い申し上げます。</p>
        
        <table class="po-table">
          <thead>
            <tr>
              <th style="width:5%;">No</th>
              <th style="width:15%;">メーカー</th>
              <th style="width:35%;">物品名</th>
              <th style="width:15%;">規格・型番</th>
              <th style="width:8%;">数量</th>
              <th style="width:8%;">単位</th>
              <th style="width:14%;">行備考(部署名)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
    grid.innerHTML += pageHtml;
  });
}

function printOldPO(idx) {
  const targetPo = poHistory[idx];
  if(!targetPo) return;
  renderPoPrintView([targetPo]);
  window.print();
}

function deletePoHistory(idx) {
  if(confirm("この発注履歴を削除しますか？")) {
    poHistory.splice(idx, 1);
    saveAllState();
    refreshOrderDashboard();
  }
}

// 商品マスタCSV出力
function downloadItemCSV() {
  const keys = Object.keys(itemMaster);
  if(keys.length === 0) { alert("商品マスタにデータがありません。"); return; }
  let csv = "\uFEFFJANコード,業者コード,業者名,メーカー名,商品名,規格・型番,単位\r\n";
  keys.forEach(jan => {
    const it = itemMaster[jan];
    const vName = vendorMaster[it.vCode] ? vendorMaster[it.vCode].name : "";
    csv += `="${jan}","${it.vCode}","${vName}","${it.maker || ''}","${it.name}","${it.spec || ''}","${it.unit}"\r\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MediLogi_商品マスタ_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// 部署マスタCSV出力
function downloadDeptCSV() {
  const keys = Object.keys(deptMaster);
  if(keys.length === 0) { alert("部署マスタにデータがありません。"); return; }
  let csv = "\uFEFF部署コード,部署名\r\n";
  keys.forEach(code => {
    csv += `="${code}","${deptMaster[code].name}"\r\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MediLogi_部署マスタ_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// 業者マスタCSV出力
function downloadVendorCSV() {
  const keys = Object.keys(vendorMaster);
  if(keys.length === 0) { alert("業者マスタにデータがありません。"); return; }
  let csv = "\uFEFF業者コード,業者名\r\n";
  keys.forEach(code => {
    csv += `="${code}","${vendorMaster[code].name}"\r\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MediLogi_業者マスタ_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// 実績CSV出力
function downloadLogCSV() {
  if(consumeLogs.length === 0) { alert("データがありません。"); return; }
  let csv = "\uFEFF消費日時,部署名,メーカー,商品名・規格,数量・単位,状態\r\n";
  consumeLogs.forEach(l => { 
    let st = l.isOrdered ? "発注済" : "未発注";
    csv += `"${l.time}","${l.deptName}","${l.maker}","${l.itemName} ${l.itemSpec || ''}","${l.qty} ${l.unit}","${st}"\r\n`; 
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MediLogi_消費実績_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// 手動バックアップ専用ロジック (任意のタイミングでのファイル排出)
function exportManualBackup() {
  const data = { items: itemMaster, depts: deptMaster, vendors: vendorMaster, facility: facilityInfo, logs: consumeLogs, poHistory: poHistory };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  
  const now = new Date();
  const dateSign = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const timeSign = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  const displayStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `院内発注カード管理システム_バックアップ_${dateSign}_${timeSign}.json`;
  a.click();

  document.getElementById("backupTimeDisplay").innerText = `最終手動バックアップ：${displayStr}`;
}

// バックアップ復元処理
function importBackup(input) {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const d = JSON.parse(e.target.result);
      if(confirm("システムデータを上書き復元しますか？")) {
        if(d.items) itemMaster = d.items;
        if(d.depts) deptMaster = d.depts;
        if(d.vendors) vendorMaster = d.vendors;
        if(d.facility) facilityInfo = d.facility;
        if(d.logs) consumeLogs = d.logs;
        if(d.poHistory) poHistory = d.poHistory;
        
        saveAllState();
        
        renderItemTable(); renderDeptTable(); renderVendorTable(); loadFacilityForm(); updateSelectOptions(); renderLogTable(); renderPrintGrid();
        alert("すべてのデータを復元しました。");
      }
    } catch(err) { alert("不適切なファイル形式です。"); }
  };
  reader.readAsText(file);
}

// --- Code39 バーコード生成ロジック ---
function generateCode39Svg(text) {
  const chars = {
    '0':'1010011011010', '1':'1101001010110', '2':'1011001010110', '3':'1101100101010',
    '4':'1010011010110', '5':'1101001101010', '6':'1011001101010', '7':'1010010110110',
    '8':'1101001011010', '9':'1011001011010', 'A':'1101010010110', 'B':'1011010010110',
    'C':'1101101001010', 'D':'1010110010110', 'E':'1101011001010', 'F':'1011011001010',
    'G':'1010100110110', 'H':'1101010011010', 'I':'1011010011010', 'J':'1010110011010',
    'K':'1101010100110', 'L':'1011010100110', 'M':'1101101010010', 'N':'1010110100110',
    'O':'1101011010010', 'P':'1011011010010', 'Q':'1010101100110', 'R':'1101010110010',
    'S':'1011010110010', 'T':'1010110110010', 'U':'1100101010110', 'V':'1001101010110',
    'W':'1100110101010', 'X':'1001011010110', 'Y':'1100101101010', 'Z':'1001101101010',
    '-':'1001010110110', '.':'1100101011010', ' ':'1001101011010', '*':'1001011011010',
    '$':'1001001001010', '/':'1001001010010', '+':'1001010010010', '%':'1010010010010'
  };
  const fullText = `*${text.toUpperCase()}*`;
  let binString = "";
  for (let i = 0; i < fullText.length; i++) {
    const c = fullText[i];
    if (chars[c]) binString += chars[c] + "0";
  }
  const width = binString.length * 2;
  let svg = `<svg class="barcode-svg" viewBox="0 0 ${width} 40" preserveAspectRatio="none">`;
  for (let i = 0; i < binString.length; i++) {
    if (binString[i] === '1') svg += `<rect x="${i * 2}" y="0" width="2" height="40" fill="#000" />`;
  }
  svg += `</svg>`;
  return svg;
}