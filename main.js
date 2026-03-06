<script>
/* ----------------- Persistence & initial state ----------------- */
const store = {
  tasks: JSON.parse(localStorage.getItem('em_tasks') || '{}'),
  messages: JSON.parse(localStorage.getItem('em_messages') || '[]'),
  mood: localStorage.getItem('em_mood') || 'neutral',
  user: localStorage.getItem('em_user') || 'JL'
};
if(!store.tasks.todo) { store.tasks = { todo:[], inprogress:[], done:[] }; localStorage.setItem('em_tasks', JSON.stringify(store.tasks)); }
document.getElementById('profileName').textContent = store.user;
document.getElementById('profileBtn').textContent = (store.user && store.user.split(' ').map(n=>n[0]).join('').slice(0,2)) || 'JL';

/* ----------------- Theme switch based on mood ----------------- */
function applyTheme(m){
  // keep base layout same; change subtle backgrounds and footer text
  if(m === 'happy'){ document.body.style.background = getComputedStyle(document.documentElement).getPropertyValue('--happy-bg') || 'linear-gradient(135deg,#FFEEF6,#FFF8F2)'; document.getElementById('wellSubtitle').textContent = 'You seem happy — great energy!'; }
  else if(m === 'neutral'){ document.body.style.background = getComputedStyle(document.documentElement).getPropertyValue('--neutral-bg') || 'linear-gradient(135deg,#F3F1FB,#F7F5FB)'; document.getElementById('wellSubtitle').textContent = 'You seem neutral.'; }
  else { document.body.style.background = getComputedStyle(document.documentElement).getPropertyValue('--stressed-bg') || 'linear-gradient(135deg,#FCEAF0,#FFF0F6)'; document.getElementById('wellSubtitle').textContent = 'You seem stressed — try a short break.'; }
  // style selected class
  document.querySelectorAll('.mood-icon').forEach(el=>el.classList.remove('selected'));
  if(m==='happy') document.getElementById('moodHappy').classList.add('selected');
  if(m==='neutral') document.getElementById('moodNeutral').classList.add('selected');
  if(m==='stressed') document.getElementById('moodStressed').classList.add('selected');
  store.mood = m; localStorage.setItem('em_mood', m);
}
function setMood(m){ applyTheme(m); playSound('notify'); }

/* apply initial mood */
applyTheme(store.mood);

/* ----------------- Profile menu ----------------- */
const profileBtn = document.getElementById('profileBtn'), profileMenu = document.getElementById('profileMenu');
profileBtn.addEventListener('click', ()=> profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block');
window.addEventListener('click', (e)=>{ if(!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) profileMenu.style.display='none'; });

function changeUser(){
  const name = prompt('Enter new display name', store.user || '');
  if(name){ store.user = name; localStorage.setItem('em_user', name); document.getElementById('profileName').textContent = name; document.getElementById('profileBtn').textContent = name.split(' ').map(n=>n[0]).join('').slice(0,2); toast('User changed'); }
}
function logout(){ store.user = ''; localStorage.removeItem('em_user'); document.getElementById('profileName').textContent = '—'; document.getElementById('profileBtn').textContent = '—'; toast('Logged out (demo)'); }

/* ----------------- Toast & Sound ----------------- */
function toast(msg, ms=3000){ const el = document.createElement('div'); el.textContent = msg; Object.assign(el.style,{position:'fixed',right:'20px',bottom:'20px',background:'rgba(0,0,0,0.8)',color:'#fff',padding:'10px 14px',borderRadius:'8px',zIndex:9999}); document.body.appendChild(el); setTimeout(()=> el.remove(), ms); playSound('notify'); }

function playSound(kind){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const now = ctx.currentTime;
    const g = ctx.createGain(); g.gain.value = 0.02; g.connect(ctx.destination);
    if(kind === 'chime'){
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = 880; o.connect(g); o.start(now); o.stop(now+0.6);
    } else if(kind === 'notify'){
      const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
      o1.type='sine'; o2.type='sine'; o1.frequency.value=880; o2.frequency.value=1320;
      const m = ctx.createGain(); m.gain.value=0.02; o1.connect(m); o2.connect(m); m.connect(ctx.destination);
      o1.start(now); o2.start(now); o1.stop(now+0.12); o2.stop(now+0.12);
    } else if(kind === 'ambientStart'){
      // create a gentle ambient noise (returns nodes to stop later)
      const master = ctx.createGain(); master.gain.value = 0.02; master.connect(ctx.destination);
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value=220; const f = ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=800;
      o.connect(f); f.connect(master); o.start(now);
      // return stop func
      return ()=>{ o.stop(); ctx.close(); };
    }
  }catch(e){}
}

/* ----------------- Mood Chart ----------------- */
const moodCtx = document.getElementById('moodChart').getContext('2d');
const moodChart = new Chart(moodCtx, {
  type:'line',
  data:{
    labels:['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'],
    datasets:[
      {label:'Happy %', data:[45,55,60,50,40,48,52], backgroundColor:'rgba(80,227,194,0.35)', borderColor:'#50E3C2', tension:0.4, fill:true},
      {label:'Stressed %', data:[20,15,10,25,30,25,20], backgroundColor:'rgba(236,72,153,0.28)', borderColor:'#EC4899', tension:0.4, fill:true}
    ]
  },
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}}}
});

/* ----------------- Focus modal & timer ----------------- */
const modalBackdrop = document.getElementById('modalBackdrop'), modalContent = document.getElementById('modalContent');
function openModal(html){ modalContent.innerHTML = html; modalBackdrop.style.display = 'flex'; modalBackdrop.setAttribute('aria-hidden','false'); }
function closeModal(){ modalBackdrop.style.display = 'none'; modalContent.innerHTML=''; modalBackdrop.setAttribute('aria-hidden','true'); }

let focusTimer = null, focusRemaining = 0, focusTotal = 0;
function openFocusModal(){
  const dur = parseInt(document.getElementById('focusDuration').value || 25,10);
  openModal(`<h3>Focus Session — ${dur} min</h3>
    <div style="display:flex;gap:12px;align-items:center;margin-top:12px">
      <svg id="focusSvg" width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke="#eee" stroke-width="7" fill="none"></circle><circle id="focusRing" cx="50" cy="50" r="45" stroke="#EC4899" stroke-width="7" fill="none" stroke-dasharray="282.6" stroke-dashoffset="282.6" transform="rotate(-90 50 50)"></circle></svg>
      <div style="flex:1">
        <div id="focusTimeText" style="font-weight:700;font-size:20px">` + formatMMSS(dur*60) + `</div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="small-btn" onclick="startFocus(${dur})">Start</button>
          <button class="small-btn" onclick="pauseFocus()">Pause</button>
          <button class="small-btn" onclick="resetFocus()">Reset</button>
          <button class="small-btn" onclick="closeModal()">Close</button>
        </div>
      </div>
    </div>`);
  focusTotal = dur*60; focusRemaining = focusTotal; updateFocusUI();
}

function startFocus(mins){
  if(focusTimer) clearInterval(focusTimer);
  if(mins) { focusTotal = mins*60; focusRemaining = focusTotal; }
  focusTimer = setInterval(()=>{ focusRemaining--; updateFocusUI(); if(focusRemaining<=0){ clearInterval(focusTimer); focusTimer=null; playSound('chime'); closeModal(); toast('Focus session complete'); } },1000);
  playSound('notify');
}

function pauseFocus(){ if(focusTimer){ clearInterval(focusTimer); focusTimer=null; playSound('notify'); } }
function resetFocus(){ if(focusTimer){ clearInterval(focusTimer); focusTimer=null; } focusRemaining = focusTotal; updateFocusUI(); }
function updateFocusUI(){ const el = document.getElementById('focusTimeText'); if(el) el.textContent = formatMMSS(focusRemaining); const ring = document.getElementById('focusRing'); if(ring && focusTotal>0){ const pct = 1 - (focusRemaining/focusTotal); ring.style.strokeDashoffset = String(282.6 * (1-pct)); } }
function formatMMSS(s){ s = Math.max(0, Math.floor(s)); const mm = String(Math.floor(s/60)).padStart(2,'0'); const ss = String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }

/* ----------------- Break / Wellness actions (reuses focus UI) ----------------- */
function startBreak(minutes, activity){
  openModal(`<h3>${activity} — ${minutes} min</h3>
    <div style="text-align:center;margin-top:8px">
      <div id="breakTimeText" style="font-weight:700;font-size:24px">${formatMMSS(minutes*60)}</div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="small-btn" onclick="startBreakTimer(${minutes})">Start</button>
        <button class="small-btn" onclick="pauseBreak()">Pause</button>
        <button class="small-btn" onclick="endBreakNow()">End</button>
      </div>
    </div>`);
  // initialize values
  breakTotal = minutes*60; breakRemaining = breakTotal; updateBreakUI();
}
let breakTimer=null, breakRemaining=0, breakTotal=0;
function startBreakTimer(mins){
  if(breakTimer) clearInterval(breakTimer);
  if(mins) { breakTotal = mins*60; breakRemaining = breakTotal; }
  breakTimer = setInterval(()=>{ breakRemaining--; updateBreakUI(); if(breakRemaining<=0){ clearInterval(breakTimer); breakTimer=null; playSound('chime'); closeModal(); toast('Break finished'); } },1000);
  playSound('notify');
}
function pauseBreak(){ if(breakTimer){ clearInterval(breakTimer); breakTimer=null; } }
function endBreakNow(){ if(breakTimer){ clearInterval(breakTimer); breakTimer=null; } closeModal(); toast('Break ended'); }
function updateBreakUI(){ const el = document.getElementById('breakTimeText'); if(el) el.textContent = formatMMSS(breakRemaining); }

/* wrapper used by footer buttons */
function startBreak(minutes, activity){ startBreak(minutes, activity); }

/* ----------------- Meditation (timer + bell) ----------------- */
function startMeditation(minutes){
  openModal(`<h3>Meditation — ${minutes} min</h3>
    <div style="text-align:center;margin-top:12px">
      <div id="medTimeText" style="font-weight:700;font-size:28px">${formatMMSS(minutes*60)}</div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="small-btn" onclick="startMeditTimer(${minutes})">Start</button>
        <button class="small-btn" onclick="pauseMedit()">Pause</button>
        <button class="small-btn" onclick="endMedit()">End</button>
      </div>
    </div>`);
  medTotal = minutes*60; medRemaining = medTotal; updateMedUI();
}
let medTimer=null, medRemaining=0, medTotal=0;
function startMeditTimer(mins){
  if(medTimer) clearInterval(medTimer);
  if(mins){ medTotal = mins*60; medRemaining = medTotal; }
  medTimer = setInterval(()=>{ medRemaining--; updateMedUI(); if(medRemaining<=0){ clearInterval(medTimer); medTimer=null; playSound('chime'); closeModal(); toast('Meditation complete'); } },1000);
}
function pauseMedit(){ if(medTimer){ clearInterval(medTimer); medTimer=null; } }
function endMedit(){ if(medTimer) clearInterval(medTimer); medTimer=null; closeModal(); }
function updateMedUI(){ const el = document.getElementById('medTimeText'); if(el) el.textContent = formatMMSS(medRemaining); }

/* ----------------- Calm music (simple ambient) ----------------- */
let ambientStopFn = null;
function toggleCalmMusic(start){
  if(start){
    // start ambient using oscillator and noise-like texture
    ambientStopFn = playAmbient();
    toast('Calm music started');
  } else {
    if(typeof ambientStopFn === 'function') ambientStopFn();
    ambientStopFn = null; toast('Calm music stopped');
  }
}
function playAmbient(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const master = ctx.createGain(); master.gain.value=0.02; master.connect(ctx.destination);
    // create two detuned oscillators
    const o1 = ctx.createOscillator(); const o2 = ctx.createOscillator();
    o1.type='sine'; o2.type='sine'; o1.frequency.value=220; o2.frequency.value=221.7; o1.connect(master); o2.connect(master);
    const lpf = ctx.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=1200; o1.connect(lpf); o2.connect(lpf); lpf.connect(master);
    o1.start(); o2.start();
    // soft random modulation
    const gainNode = ctx.createGain(); gainNode.gain.value=0.002; const lfo = ctx.createOscillator(); lfo.frequency.value=0.1; lfo.type='sine'; const lfoGain = ctx.createGain(); lfoGain.gain.value=300;
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfo.start();
    // return stop function
    return ()=>{ try{ o1.stop(); o2.stop(); lfo.stop(); ctx.close(); }catch(e){} };
  }catch(e){ return null; }
}

/* ----------------- Breathing exercise (canvas) ----------------- */
let breathAnim = null;
function openBreathing(){
  openModal(`<h3>Breathing — 4-7-8</h3>
    <canvas id="breathCanvas" class="breath" width="300" height="300"></canvas>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
      <button class="small-btn" onclick="startBreathing()">Start</button>
      <button class="small-btn" onclick="stopBreathing()">Stop</button>
      <button class="small-btn" onclick="closeModal()">Close</button>
    </div>`);
  drawBreathFrame(0); // initial
}
let breathing = false;
function startBreathing(){
  breathing=true;
  const canvas = document.getElementById('breathCanvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d'); let t=0;
  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const w=canvas.width, h=canvas.height; const maxR=100;
    // cycle param for inhale/exhale using 6s cycle: 4 inhale, 7 hold, 8 exhale -> we will approximate smooth sin
    const period=19; t+=0.04;
    const p = (Math.sin(t) + 1)/2; const r = 40 + p * maxR;
    ctx.fillStyle = 'rgba(236,72,153,0.15)'; ctx.beginPath(); ctx.arc(w/2,h/2,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#333'; ctx.font='18px Inter'; ctx.textAlign='center';
    ctx.fillText(breathing ? (p>0.66 ? 'Exhale' : p>0.33 ? 'Hold' : 'Inhale') : 'Ready', w/2, h/2);
    breathAnim = requestAnimationFrame(frame);
  }
  frame();
}
function stopBreathing(){ breathing=false; if(breathAnim) cancelAnimationFrame(breathAnim); }

/* ----------------- Eye exercise (20-20-20) ----------------- */
let eyeTimer=null, eyeRemaining=0;
function openEyeExercise(){
  openModal(`<h3>Eye Exercise — 20-20-20 Rule</h3>
    <div style="text-align:center;margin-top:12px">
      <div id="eyeText" style="font-weight:700;font-size:20px">Focus on near object</div>
      <div id="eyeTime" style="font-weight:600;margin-top:8px">00:20</div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
        <button class="small-btn" onclick="startEye()">Start 20s</button>
        <button class="small-btn" onclick="pauseEye()">Pause</button>
        <button class="small-btn" onclick="endEye()">End</button>
      </div>
    </div>`);
  eyeRemaining = 20; updateEyeUI();
}
function startEye(){
  if(eyeTimer) clearInterval(eyeTimer);
  eyeTimer = setInterval(()=>{ eyeRemaining--; updateEyeUI(); if(eyeRemaining<=0){ clearInterval(eyeTimer); eyeTimer = null; document.getElementById('eyeText').textContent = 'Look at something 20ft away for 20s'; eyeRemaining = 20; updateEyeUI(); toast('20 seconds up — look far'); } },1000);
}
function pauseEye(){ if(eyeTimer){ clearInterval(eyeTimer); eyeTimer=null; } }
function endEye(){ if(eyeTimer){ clearInterval(eyeTimer); eyeTimer=null; } closeModal(); }
function updateEyeUI(){ const el = document.getElementById('eyeTime'); if(el) el.textContent = formatMMSS(eyeRemaining); }

/* ----------------- Tasks: CRUD + drag & drop ----------------- */

  (() => {
  const STORAGE_KEY = 'tb_board_v1';

  // Default board state
  const defaultBoard = {
    columns: [
      { id: 'col-backlog', title: 'Backlog', tasks: [
        { id: 't-'+Date.now(), title: 'Research competitors', desc:'Look at features & pricing', members:['Asha'] }
      ]},
      { id: 'col-todo', title: 'To Do', tasks: [
        { id: 't-'+(Date.now()+1), title: 'Create wireframes', desc:'Homepage & dashboard', members:['Rajan'] }
      ]},
      { id: 'col-inprogress', title: 'In Progress', tasks: [
        { id: 't-'+(Date.now()+2), title: 'Design mockups', desc:'High fidelity', members:['Krishtina'] }
      ]},
      { id: 'col-done', title: 'Done', tasks: []}
    ]
  };

  // State
  let board = loadBoard();
  const boardEl = document.getElementById('tb-board');
  const addColumnBtn = document.getElementById('tb-add-column');
  const resetBtn = document.getElementById('tb-reset');
  const modalBackdrop = document.getElementById('tb-modal-backdrop');
  const modalEl = document.getElementById('tb-modal');

  // Load / Save
  function loadBoard(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultBoard));
    return JSON.parse(JSON.stringify(defaultBoard));
  }
  function saveBoard(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  }

  // Utilities
  function findTask(id){
    for(let ci=0; ci<board.columns.length; ci++){
      const col = board.columns[ci];
      for(let ti=0; ti<col.tasks.length; ti++){
        if(col.tasks[ti].id === id) return { colIndex: ci, taskIndex: ti, task: col.tasks[ti] };
      }
    }
    return null;
  }
  function uid(prefix='id'){ return prefix + '-' + Date.now() + '-' + Math.floor(Math.random()*9999); }

  // Rendering
  function renderBoard(){
    boardEl.innerHTML = '';
    board.columns.forEach((col, colIndex) => {
      const colEl = document.createElement('div'); colEl.className = 'tb-column'; colEl.dataset.colIndex = colIndex;
      // header
      const header = document.createElement('div'); header.className = 'tb-column-header';
      const title = document.createElement('div'); title.className='tb-col-title'; title.contentEditable = false; title.textContent = col.title;
      title.addEventListener('dblclick', ()=> {
        const newTitle = prompt('Rename section', col.title);
        if(newTitle && newTitle.trim()){ col.title = newTitle.trim(); saveBoard(); renderBoard(); }
      });
      const actions = document.createElement('div'); actions.className='tb-col-actions';
      const delColBtn = document.createElement('button'); delColBtn.title='Delete section'; delColBtn.innerHTML='🗑️';
      delColBtn.addEventListener('click', ()=> {
        if(!confirm(`Delete section "${col.title}" and all its tasks?`)) return;
        board.columns.splice(colIndex,1);
        saveBoard(); renderBoard();
      });
      actions.appendChild(delColBtn);
      header.appendChild(title); header.appendChild(actions);

      // task list
      const list = document.createElement('div'); list.className='tb-task-list'; list.dataset.colIndex = colIndex;
      // allow drop
      list.addEventListener('dragover', (ev)=>{ ev.preventDefault(); list.classList.add('drag-over'); });
      list.addEventListener('dragleave', ()=> list.classList.remove('drag-over'));
      list.addEventListener('drop', (ev)=> {
        ev.preventDefault(); list.classList.remove('drag-over');
        const data = ev.dataTransfer.getData('text/plain');
        try{
          const payload = JSON.parse(data);
          if(payload.type === 'task'){
            moveTask(payload.taskId, payload.fromColIndex, parseInt(list.dataset.colIndex,10), payload.fromTaskIndex);
          }
        }catch(e){}
      });

      // tasks
      col.tasks.forEach((task, taskIndex) => {
        const taskEl = document.createElement('div'); taskEl.className='tb-task'; taskEl.draggable = true;
        taskEl.dataset.taskId = task.id;
        // content
        const left = document.createElement('div'); left.className='left';
        const ttitle = document.createElement('div'); ttitle.className='title'; ttitle.textContent = task.title;
        const tmeta = document.createElement('div'); tmeta.className='meta'; tmeta.textContent = (task.members && task.members.length? 'Members: '+task.members.join(', ') : task.desc || '');
        left.appendChild(ttitle); left.appendChild(tmeta);

        // actions
        const actionsWrap = document.createElement('div'); actionsWrap.className='task-actions';
        const openBtn = document.createElement('button'); openBtn.title='Open task'; openBtn.innerHTML='✏️'; openBtn.addEventListener('click', ()=> openTaskModal(colIndex, taskIndex));
        const delBtn = document.createElement('button'); delBtn.title='Delete task'; delBtn.innerHTML='🗑️'; delBtn.addEventListener('click', ()=> {
          if(!confirm('Delete this task?')) return;
          board.columns[colIndex].tasks.splice(taskIndex,1);
          saveBoard(); renderBoard();
        });
        actionsWrap.appendChild(openBtn); actionsWrap.appendChild(delBtn);

        taskEl.appendChild(left); taskEl.appendChild(actionsWrap);

        // drag events
        taskEl.addEventListener('dragstart', (ev)=>{
          taskEl.classList.add('dragging');
          ev.dataTransfer.effectAllowed = 'move';
          const payload = { type:'task', taskId: task.id, fromColIndex: colIndex, fromTaskIndex: taskIndex };
          ev.dataTransfer.setData('text/plain', JSON.stringify(payload));
        });
        taskEl.addEventListener('dragend', ()=> taskEl.classList.remove('dragging'));

        // click to open modal
        taskEl.addEventListener('dblclick', ()=> openTaskModal(colIndex, taskIndex));

        list.appendChild(taskEl);
      });

      // quick add input (Enter to add)
      const input = document.createElement('input'); input.className='tb-add-input'; input.placeholder = 'Add task and press Enter';
      input.addEventListener('keydown', (e)=> {
        if(e.key === 'Enter'){
          const val = input.value.trim();
          if(!val) return;
          const newTask = { id: uid('task'), title: val, desc:'', members:[] };
          board.columns[colIndex].tasks.push(newTask);
          saveBoard(); renderBoard();
          // focus new input
          setTimeout(()=> {
            const col = document.querySelector(`.tb-column[data-col-index="${colIndex}"] .tb-add-input`);
            if(col) col.focus();
          },200);
        }
      });

      // footer (count)
      const footer = document.createElement('div'); footer.className='tb-column-footer';
      const count = document.createElement('div'); count.style.fontSize='12px'; count.style.color='#7b6a76'; count.textContent = `${col.tasks.length} task${col.tasks.length!==1?'s':''}`;
      footer.appendChild(count);

      // append
      colEl.appendChild(header);
      colEl.appendChild(list);
      colEl.appendChild(input);
      colEl.appendChild(footer);
      boardEl.appendChild(colEl);
    });

    // Rebind for newly created elements (none required because we attach handlers during creation)
  }

  // Move task safely (no disappearing)
  function moveTask(taskId, fromColIndex, toColIndex, fromTaskIndex){
    if(fromColIndex === toColIndex) return;
    // find & remove task from original
    const fromCol = board.columns[fromColIndex];
    const idx = fromCol.tasks.findIndex(t=>t.id === taskId);
    if(idx === -1){
      // fallback: search across all columns
      const found = findTask(taskId);
      if(found){
        fromColIndex = found.colIndex;
        fromTaskIndex = found.taskIndex;
      } else {
        console.warn('task not found to move', taskId); return;
      }
    }
    const [task] = board.columns[fromColIndex].tasks.splice(fromTaskIndex !== undefined ? fromTaskIndex : idx, 1);
    // add to destination
    board.columns[toColIndex].tasks.push(task);
    saveBoard();
    renderBoard();
  }

  // Add new column
  addColumnBtn.addEventListener('click', ()=>{
    const name = prompt('New section name','New Section');
    if(!name) return;
    const col = { id: uid('col'), title: name.trim(), tasks: [] };
    board.columns.push(col);
    saveBoard();
    renderBoard();
    // scroll to end
    setTimeout(()=> document.getElementById('tb-board').scrollLeft = document.getElementById('tb-board').scrollWidth, 100);
  });

  // Reset board (demo)
  resetBtn.addEventListener('click', ()=>{
    if(!confirm('Reset board to default demo state?')) return;
    localStorage.removeItem(STORAGE_KEY);
    board = loadBoard();
    renderBoard();
  });

  // Task detail modal
  function openTaskModal(colIndex, taskIndex){
    const task = board.columns[colIndex].tasks[taskIndex];
    if(!task) return;
    modalEl.innerHTML = `
      <h3 style="margin:0 0 8px 0;font-weight:800">${escapeHtml(task.title)}</h3>
      <div class="tb-form-row">
        <label style="font-weight:600">Title</label>
        <input id="tb-edit-title" class="tb-input" value="${escapeHtml(task.title)}" />
      </div>
      <div class="tb-form-row">
        <label style="font-weight:600">Description</label>
        <textarea id="tb-edit-desc" class="tb-textarea">${escapeHtml(task.desc || '')}</textarea>
      </div>
      <div class="tb-form-row">
        <label style="font-weight:600">Members (comma separated)</label>
        <input id="tb-edit-members" class="tb-input" value="${escapeHtml((task.members||[]).join(', '))}" />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button class="tb-btn ghost" id="tb-cancel">Cancel</button>
        <button class="tb-btn" id="tb-save">Save</button>
        <button class="tb-btn" id="tb-delete" style="background:#f43f5e">Delete</button>
      </div>
    `;
    modalBackdrop.style.display = 'flex';
    modalBackdrop.setAttribute('aria-hidden','false');

    document.getElementById('tb-cancel').addEventListener('click', closeModal);
    document.getElementById('tb-save').addEventListener('click', ()=>{
      const newTitle = document.getElementById('tb-edit-title').value.trim();
      const newDesc = document.getElementById('tb-edit-desc').value.trim();
      const newMembersRaw = document.getElementById('tb-edit-members').value.trim();
      const members = newMembersRaw ? newMembersRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
      task.title = newTitle || task.title;
      task.desc = newDesc;
      task.members = members;
      saveBoard();
      closeModal();
      renderBoard();
    });
    document.getElementById('tb-delete').addEventListener('click', ()=>{
      if(!confirm('Delete this task permanently?')) return;
      board.columns[colIndex].tasks.splice(taskIndex,1);
      saveBoard(); closeModal(); renderBoard();
    });
  }

  function closeModal(){
    modalBackdrop.style.display = 'none';
    modalBackdrop.setAttribute('aria-hidden','true');
    modalEl.innerHTML = '';
  }

  // Click outside modal closes
  modalBackdrop.addEventListener('click', (e)=> {
    if(e.target === modalBackdrop) closeModal();
  });

  // Escape to close
  window.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

  // Escape html helper
  function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

  // Initial render
  renderBoard();

})();


/* ----------------- Chat: send, attach, emojis, enter sends ----------------- */
const chatMessages = document.getElementById('chatMessages'), chatText = document.getElementById('chatText'), fileInput = document.getElementById('fileInput'), attachmentPreview = document.getElementById('attachmentPreview');
fileInput.addEventListener('change', handleFileAttach);

function handleFileAttach(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(){ const url = reader.result; attachmentPreview.innerHTML = ''; if(f.type.startsWith('image/')) { const img = document.createElement('img'); img.src = url; img.style.maxWidth='100%'; img.style.borderRadius='8px'; attachmentPreview.appendChild(img); }
    else { const p = document.createElement('div'); p.textContent = f.name; attachmentPreview.appendChild(p); }
    attachmentPreview.dataset.file = url; attachmentPreview.dataset.filename = f.name;
  }
  reader.readAsDataURL(f);
}

function toggleEmojiPicker(){ const p = document.getElementById('emojiPicker'); p.style.display = p.style.display==='none'?'block':'none'; }
function insertEmoji(e){ chatText.value += e; chatText.focus(); }

function sendChat(){
  const txt = chatText.value.trim();
  const attachment = attachmentPreview.dataset.file ? { data: attachmentPreview.dataset.file, name: attachmentPreview.dataset.filename } : null;
  if(!txt && !attachment) return;
  const message = { id:'m'+Date.now(), user:store.user || 'You', text: txt, ts: Date.now(), attachment };
  store.messages.push(message); localStorage.setItem('em_messages', JSON.stringify(store.messages));
  chatText.value=''; attachmentPreview.innerHTML=''; delete attachmentPreview.dataset.file; delete attachmentPreview.dataset.filename;
  renderChat();
  playSound('notify');
}
chatText.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); sendChat(); } });

function renderChat(){
  chatMessages.innerHTML = '';
  store.messages.forEach(m=>{
    const el = document.createElement('div');
    if(m.user === (store.user||'You')){
      el.style.alignSelf='flex-end';
      el.innerHTML = `<div style="background:var(--dominant-pink);color:white;padding:8px;border-radius:8px;max-width:85%"><strong>You</strong><div style="margin-top:6px">${escapeHtml(m.text)}</div></div>`;
    } else {
      el.innerHTML = `<div style="background:#f1f5f9;padding:8px;border-radius:8px;max-width:85%"><strong>${escapeHtml(m.user)}</strong><div style="margin-top:6px">${escapeHtml(m.text)}</div></div>`;
    }
    if(m.attachment){
      const a = document.createElement('div'); a.style.marginTop='6px';
      if(m.attachment.data.startsWith('data:image')){ const im = document.createElement('img'); im.src = m.attachment.data; im.style.maxWidth='220px'; im.style.borderRadius='6px'; a.appendChild(im); }
      else { const p = document.createElement('a'); p.href = m.attachment.data; p.textContent = m.attachment.name || 'Attachment'; p.target='_blank'; a.appendChild(p); }
      el.appendChild(a);
    }
    chatMessages.appendChild(el);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/* ----------------- Utilities ----------------- */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

/* ----------------- Initialization ----------------- */
function init(){
  // load tasks from storage if present
  const stored = JSON.parse(localStorage.getItem('em_tasks') || 'null');
  if(stored) store.tasks = stored;
  const msgs = JSON.parse(localStorage.getItem('em_messages') || 'null');
  if(msgs) store.messages = msgs;
  renderTasks(); renderChat();
  // wire footer buttons: meditation, calm music, breathing, eye exercise
  // meditation button
  document.querySelectorAll('.small-btn').forEach(btn=>{
    // handled individually where needed
  });
  // attach start meditation from footer "Meditation" button
  // find the footer buttons by text - simpler: add listeners inline below if necessary (we used startBreak())
  // wire chat initial focus
  chatText.addEventListener('focus', ()=> document.getElementById('emojiPicker').style.display='none');
}
init();

/* Make sure state is saved on unload */
window.addEventListener('beforeunload', ()=> { localStorage.setItem('em_tasks', JSON.stringify(store.tasks)); localStorage.setItem('em_messages', JSON.stringify(store.messages)); localStorage.setItem('em_mood', store.mood); });

/* ----------------- Expose functions used inline ----------------- */
window.setMood = setMood;
window.openFocusModal = openFocusModal;
window.startMeditation = ()=> startMeditation(5); // default 5-min quick link
window.toggleCalmMusic = ()=> { if(!ambientStopFn){ ambientStopFn = playAmbient(); } else { ambientStopFn(); ambientStopFn = null; } };
window.openBreathing = openBreathing;
window.openEyeExercise = openEyeExercise;
window.insertEmoji = insertEmoji;
window.sendChat = sendChat;
window.startBreak = startBreak; // footer uses
window.addTask = addTask;
window.openTaskEditor = openTaskEditor;
window.deleteTask = deleteTask;
window.renderTasks = renderTasks;
window.startMeditation = startMeditation;
window.toggleCalmMusic = ()=> { if(!ambientStopFn){ ambientStopFn = playAmbient(); } else { ambientStopFn(); ambientStopFn = null; } };

/* For footer quick actions binding */
document.querySelectorAll('.footer-well .small-btn').forEach(b=>{
  b.addEventListener('click', (e)=>{
    const txt = e.target.textContent.trim();
    if(txt.includes('Meditation')) startMeditation(5);
    else if(txt.includes('Calm Music')) { if(!ambientStopFn) ambientStopFn = playAmbient(); else { ambientStopFn(); ambientStopFn = null; } }
    else if(txt.includes('Breathing')) openBreathing();
    else if(txt.includes('Eye')) openEyeExercise();
  });
});

/* Wire meditation & other actions example: focus scheduler open button handled above */
document.getElementById('startFocusBtn').addEventListener('click', openFocusModal);

/* file input attach handler already added above, also update preview click to send */
attachmentPreview.addEventListener('click', ()=> { /* preview click does nothing */ });

</script>