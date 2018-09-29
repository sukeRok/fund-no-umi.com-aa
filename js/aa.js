'use strict';
// const $ = (...s) => { return document.querySelectorAll(...s); }
class Asset{
  /*** 資産クラス ***/
  constructor(name, expected_return = 0, risk = 0){
    // アセットクラス名
    this._name = name;
    // 期待リターン
    this._expected_return = expected_return;
    // リスク
    this._risk = risk;
    // 相関係数
    this.correlations = new Map();
  }
  get name(){return this._name;}
  get expected_return(){return this._expected_return;}
  set expected_return(r){
    if (!isNaN(r)){
      this._expected_return = r; }
  }
  get risk(){return this._risk;}
  set risk(r){
    if (!isNaN(r)){
      this._risk = r;
    }
  }
}

class AssetAllocation{
  /*** 資産配分クラス ***/
  constructor(){
    // 対象の資産クラス
    this._assets = [];
    // 資産クラスに対する投資金額
    this._asset_investment = new Map();
    // 信託報酬
    this._fee = 0;
  }

  set_asset_investment(asset_name, value){
    /*** 資産クラスに対する投資金額をセットする ***/
    if(!isNaN(value)){
      this._asset_investment.set(asset_name, value);
    }
  }

  set fee(fee){
    /*** 信託報酬をセットする ***/
    if (!isNaN(fee)){
      this._fee = fee;
    }
  }
  get fee(){ return this._fee; }

  get_asset(name){
    for (const a of this._assets){
      if (a.name === name){
        return a;
      }
    }
    return null;
  }

  get_asset_investment(asset_name){
    /*** 資産クラスに対する投資金額 ***/
    return this._asset_investment.get(asset_name);
  }

  get_asset_investment_ratio(asset_name){
    /*** 投資金額に対する資産クラスの投資率 ***/
    if (this.total_investment === 0) return 0;
    return this._asset_investment.get(asset_name) / this.total_investment;
  }

  get total_investment(){
    /*** (年間)総投資額 ***/
    let t = 0;
    for (const v of this._asset_investment.values()){
      t += v;
    }
    return t;
  }

  get total_return(){
    /*** (年間)総期待リターン ***/
    if (this.total_investment === 0) return 0;
    let t_r = 0; // リターン
    for (const a of this._assets){
      t_r += a.expected_return * this._asset_investment.get(a.name) / this.total_investment;
    }
    t_r = (t_r / 100) - this.fee;
    return (t_r < 0) ? 0 : t_r;
  }

  get total_risk(){
    /*** (年間)総リスク ***/
    if (this.total_investment === 0) return 0;
    // 標準偏差
    let rk = 0;
    for (const a of this._assets){
      rk += Math.pow(a.risk * this._asset_investment.get(a.name) / this.total_investment / 100, 2);
    }
    for (let i = 0, len = this._assets.length; i < len; i++){
      const a_i = this._assets[i];
      for (let j = i+1; j < len; j++){
        const a_j = this._assets[j];
        rk += (a_i.risk * this._asset_investment.get(a_i.name) / this.total_investment / 100) *
          (a_j.risk * this._asset_investment.get(a_j.name) / this.total_investment / 100) *
          a_i.correlations.get(a_j.name) * 2;
        console.log(`${a_i.name} : ${a_j.name}`)
      }
    }
    return Math.sqrt(rk);
  }
}

class AssetAllocationTables extends AssetAllocation{
  /*** テーブルを操作するクラス ***/
  constructor(){
    console.log("aa_table");
    super();
    this._init();
    this.CORRELATION_TABLE_ID = 'correlation_table';
    this.ASSET_ALLOCATION_TABLE_ID = 'asset_allocation_table';
  }

  _init(){
    console.log('_init()');
    // テーブルを読み込み、資産クラスを作成する
    this.read_table_data();
    // 入力可能な場所でキーイベントがあれば読み込み、テーブルをリフレッシュする
    for (const input of document.querySelectorAll('input[type=text]')){
      input.addEventListener('keyup', () => {
        this.read_refresh(input);
      });
    }
    // 投資金額を入力中はタブキーで次に資産クラスに移動できるようにする
    for (const invest of document.querySelectorAll('.investment')){
      invest.addEventListener('focus', () => {
        console.log(`.investment addEventListener ${invest}`)
        for (const e of document.querySelectorAll('.investment')){
          e.removeAttribute('tabindex');
          e.style.border = '1px solid #3333ff';
        }
        for (const e of document.querySelectorAll('.allocation_ratio')){
          e.removeAttribute('style');
          e.setAttribute('tabindex', -1);
        }
        (document.querySelector('#total_invest')).removeAttribute('style');
        (document.querySelector('#total_invest')).setAttribute('tabindex', -1);
        (document.querySelector('#fee')).style.border = '1px solid #3333ff';
      });
    }
    // 配分比率を入力中はタブキーで次に資産クラスに移動できるようにする
    for (const ratio of document.querySelectorAll('.allocation_ratio, #total_invest')){
      ratio.addEventListener('focus', () => {
        console.log(`.allocation_ratio addEventListener ${ratio}`)
        for (const e of document.querySelectorAll('.allocation_ratio')){
          e.removeAttribute('tabindex');
          e.style.border = '1px solid #3333ff';
        }
        for (const e of document.querySelectorAll('.investment')){
          e.removeAttribute('style');
          e.setAttribute('tabindex', -1);
        }
        (document.querySelector('#total_invest')).removeAttribute('tabindex');
        (document.querySelector('#total_invest')).style.border = '1px solid #3333ff';
        (document.querySelector('#fee')).style.border = '1px solid #3333ff';
      });
    }
    // アセットアロケーションテーブルからフォーカスが外れたら枠線の色と
    // tabindexを外す
    for (const not_aa of document.querySelectorAll(
      `.investment, .allocation_ratio, #total_invest, #fee`)){
      not_aa.addEventListener('focusout', () => {
        (document.querySelector('#total_invest')).removeAttribute('tabindex');
        (document.querySelector('#total_invest')).removeAttribute('style');
        (document.querySelector('#fee')).removeAttribute('style');
        for (const e of document.querySelectorAll('.investment, .allocation_ratio')){
          e.removeAttribute('style');
          e.removeAttribute('tabindex');
        }
      },);
    }
    // 資産クラスはセレクタ名に使うので、セレクタに使えない文字は入力させない
    for (const btn of document.querySelectorAll('.append_asset')){
      btn.addEventListener('click', () => {
        const name = window.prompt('資産クラスの名前を入力してください');
        if(name){
          if(name.match(/[ !"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/)){
            alert("使用できない文字が入っています");
          }else{
            this.append_asset(name);
          }
        }
      });
    }
    for (const btn of document.querySelectorAll('.delete_asset')){
      btn.addEventListener('click', () => {
        console.log(btn.parentElement.parentElement.className)
        this.delete_asset(btn.parentElement.parentElement.className)
      });
    }
  }

  _$(s){
    /*** querySelectorのラッパ  ***/
    console.log(`_$(${s})`);
    if (s.match(/^#/) && !s.match(/[, \*]/)){
      return document.getElementById(s.replace(/^#/, ''));
    }
    return document.querySelectorAll(s);
  }

  read_table_data(){
    /*** 各テーブルの値を取得し、資産クラスが登録されていなければ追加する ***/
    console.log('read_table_data()');

    // 資産クラスがなければ作る
    for (const name of document.querySelectorAll('.asset_name')){
      if (! this.get_asset(name.innerText)){
        this._assets.push(new Asset(name.innerText));
      }
    }
    const assets = this._assets;
    console.log(`read_data assets.length: ${assets.length}`)

    // 相関係数の取得
    for (let i = 0, len = assets.length; i < len; i++){
      const name = assets[i].name;
      for (const elm of document.querySelectorAll(`tr.${name}>*>.correlation_value`)){
        const v = elm.value;
        if(!isNaN(v)){
          this._assets[i].correlations.set(elm.parentElement.className, v);
        }
      }
      for (const elm of document.querySelectorAll(`td.${name}>.correlation_value`)){
        const v = elm.value;
        if(!isNaN(v)){
          this._assets[i].correlations.set(elm.parentElement.parentElement.className, v);
        }
      }
    }
    // 投資金額、期待リターン、リスク、信託報酬の取得
    for (let i = 0, len = assets.length; i < len; i++){
      this._assets[i].expected_return = parseFloat(document.querySelectorAll('.expected_return')[i].value);
      this._assets[i].risk = parseFloat(document.querySelectorAll('.risk')[i].value);
      this.set_asset_investment(
        this._assets[i].name,
        parseFloat(document.querySelectorAll('.investment')[i].value)
      );
    }
    this.fee = document.getElementById('fee').value / 100;
  }

  refresh_table_data(change_elem){
    /*** 変更されたところ以外の各テーブルの値を更新する ***/

    console.log(`refresh_table_data(${change_elem.className})`);
    // 相関係数の設定
    const c_t = document.getElementById(this.CORRELATION_TABLE_ID);
    if (change_elem.className !== 'correlation_value'){
      const assets = this._assets;
      for (let i = 0, len = assets.length; i < len; i++){
        for (let j = 0; j < len; j++){
          if (i > j){
            const v = this._assets[i].correlations.get(assets[j].name);
            c_t.rows[i+1].cells[j+2].childNodes[0].value = v;
          }
        }
      }
    }
    // 投資金額、期待リターン、リスク、信託報酬の設定
    let total_ratio = 0;
    const assets = this._assets;
    for (let i = 0, len = assets.length; i < len; i++){
      if (change_elem.className !== 'investment'){
        document.querySelectorAll('.investment')[i].value =
          (this.get_asset_investment(assets[i].name)).toFixed(2);
      }
      if (change_elem.className !== 'allocation_ratio'){
        const invst_rerio = this.get_asset_investment_ratio(assets[i].name);
        total_ratio += invst_rerio;
        document.querySelectorAll('.allocation_ratio')[i].value = (invst_rerio * 100).toFixed(2);
      }else{
        total_ratio = parseFloat(document.getElementById('total_ratio').innerHTML) / 100;
      }
      if (change_elem.className !== 'expected_return'){
        document.querySelectorAll('.expected_return')[i].value =
          (assets[i].expected_return).toFixed(2);
      }
      if (change_elem.className !== 'risk'){
        document.querySelectorAll('.risk')[i].value =
          (assets[i].risk).toFixed(2);
      }
    }
    if (change_elem.id !== 'fee'){
      document.getElementById('fee').value = (this.fee * 100).toFixed(2);
    }
    if (change_elem.id !== 'total_invest'){
      document.getElementById('total_invest').value = (this.total_investment).toFixed(2);
    }
    document.getElementById('total_ratio').innerText = (total_ratio * 100).toFixed(2);
    document.getElementById('total_return').innerText = (this.total_return * 100).toFixed(2);
    document.getElementById('total_risk').innerText = (this.total_risk * 100).toFixed(2);
  }
  read_refresh(change_elem){
    /*** テーブルの値を取得し更新する ***/

   console.log(`read_refresh(${change_elem.className})`);
    // 投資金額が変更された際に配分比率が合計100%になっていなければ何もしない
    if (change_elem.id === 'total_invest'){
      const total_ratio = document.querySelector('#total_ratio').innerText;
        console.log(`read_refresh total_ratio: ${total_ratio}`)
      if (parseFloat(total_ratio) !== 100){
        return null;
      }
    }
    // 配分比率が変更されていたら、
    // 合計が100%になっていることを確認し、投資金額を変更する
    if (change_elem.className === 'allocation_ratio'){
      let total_ratio = 0;
      for (const e of document.querySelectorAll('.allocation_ratio')){
        if (isNaN(parseFloat(e.value))){return null}
        total_ratio += parseFloat(e.value);
        document.getElementById('total_ratio').innerText = total_ratio.toFixed(2);
        console.log(`read_refresh total_ratio: ${total_ratio}`)
      }
      if (total_ratio !== 100){
        return null;
      }else{
        const total_invest = parseFloat(document.getElementById('total_invest').value);
        if (isNaN(total_invest)){return null}
        for (let i = 0, len = this._assets.length; i < len; i++){
          const ratio = parseFloat(document.querySelectorAll('.allocation_ratio')[i].value);
          const v = total_invest * ratio / 100;
          document.querySelectorAll('.investment')[i].value = v;
        }
      }
    }
    // テーブルの値を取得し更新する
    this.read_table_data ();
    this.refresh_table_data(change_elem);
  }
  delete_asset(asset_name){
    /***
     * 下記を削除する
     * - 資産クラス
     * - 関係する相関係数
     * - 資産クラスに対する投資金額
     ***/
    console.log("delete_asset start :" + asset_name)
    // 資産クラスの削除
    this._assets = this._assets.filter(asset => asset.name !== asset_name);
    // 相関係数の削除
    for (const a of this._assets){
      a.correlations.delete(asset_name);
    }
    // 投資金額の削除
    this._asset_investment.delete(asset_name);
    // テーブルから資産クラスと関係するカラムを削除
    for (const elm of document.querySelectorAll(`td.${asset_name}`)){
      elm.parentNode.removeChild(elm);
    }
    for (const elm of document.querySelectorAll(`*.${asset_name}`)){
      elm.parentNode.removeChild(elm);
    }
  }
  append_asset(asset_name){
    console.log(`append_asset(${asset_name})`);
    /*** 資産クラスを追加する  ***/
    // アセットアロケーションテーブルへ追加
    {
      const t = document.querySelector(`#${this.ASSET_ALLOCATION_TABLE_ID}`);
      const row = (t.tBodies[0]).insertRow(-1);
      row.setAttribute('class', asset_name);
      let cell = row.insertCell(-1);
      cell.innerText = asset_name;
      cell.setAttribute('class', 'aa-asset-name');
      cell = row.insertCell(-1);
      cell.innerHTML = `<input type="text" class="investment" value="0.00">万円`;
      cell = row.insertCell(-1);
      cell.innerHTML = `<input type="text" class="allocation_ratio" value="0.00">%`;
      cell = row.insertCell(-1);
      cell.innerHTML = `<input type="text" class="expected_return" tabindex="-1" value="0.00">%`;
      cell = row.insertCell(-1);
      cell.innerHTML = `<input type="text" class="risk" tabindex="-1" value="0.00">%`;
    }
    // 相関係数テーブルへ追加
    {
      const assets = this._assets;
      const t = document.querySelector(`#${this.CORRELATION_TABLE_ID}`);
      const h = t.tHead;
      const th = h.rows[0].appendChild(document.createElement('th'));
      th.innerText = asset_name;
      th.setAttribute('class', asset_name);
      for (const row of t.tBodies[0].rows){
        const td = row.insertCell(-1);
        td.innerText = "-"
        td.setAttribute('class', asset_name);
      }
      const row = (t.tBodies[0]).insertRow(-1);
      row.setAttribute('class', asset_name);
      let td = row.insertCell(-1);
      td.innerHTML = `<input type="button" class="delete_asset" value="削除">`
      td.setAttribute('style', 'border-bottom:none');

      td = row.insertCell(-1);
      td.innerHTML = `<span class="asset_name">${asset_name}</span>`;
      for (let i = 0, len = assets.length; i < len; i++){
        td = row.insertCell(-1);
        td.innerHTML = `<input type="text" class="correlation_value" value="0.00">`;
        td.setAttribute('class', assets[i].name);
      }
      td = row.insertCell(-1);
      td.innerText = '1';
      td.setAttribute('class', asset_name);
    }
    this._init();
  }

}

/*** html が読み込まれた時点で実行される関数 ***/
const aa_t = new AssetAllocationTables();
