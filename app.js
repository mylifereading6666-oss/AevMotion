import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
const $=id=>document.getElementById(id), ffmpeg=new FFmpeg();
let videoFile=null,videoUrl=null,resultUrl=null,loaded=false,job=0,cancelRequested=false;
const input=$('videoInput'),drop=$('dropzone');
const fmt=n=>Number(n).toFixed(1)+'s';
const size=n=>n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';
function setError(m){$('errorBox').textContent=m;$('errorBox').classList.remove('hidden')}
function clearResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl=null;$('result').classList.add('hidden')}
function updateRange(){const a=Number($('startRange').value),b=Number($('endRange').value);$('startLabel').textContent=fmt(a);$('endLabel').textContent=fmt(b);$('startNumber').value=a;$('endNumber').value=b}
function clampRanges(which){let a=Number($('startRange').value),b=Number($('endRange').value),d=$('preview').duration||0;if(which==='start'&&a>=b)a=Math.max(0,b-.1);if(which==='end'&&b<=a)b=Math.min(d,a+.1);$('startRange').value=a;$('endRange').value=b;updateRange()}
function setVideo(file){if(!file||!file.type.startsWith('video/')){setError('動画ファイルを選択してください。');return}videoFile=file;if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=URL.createObjectURL(file);$('preview').src=videoUrl;$('previewPlaceholder').classList.add('hidden');$('fileInfo').classList.remove('hidden');$('fileName').textContent=file.name;$('fileMeta').textContent=size(file.size)+' · '+(file.type||'video');$('errorBox').classList.add('hidden');clearResult();$('preview').onloadedmetadata=()=>{const d=$('preview').duration;if(!Number.isFinite(d)||d<=0){setError('動画の長さを取得できませんでした。別の形式をお試しください。');return}$('durationLabel').textContent='全体 '+fmt(d);for(const id of ['startRange','endRange']){$(id).max=d;$(id).disabled=false}$('endRange').value=d;$('endNumber').value=d;$('startNumber').disabled=false;$('endNumber').disabled=false;$('convertBtn').disabled=false;updateRange()}}
input.addEventListener('change',e=>setVideo(e.target.files[0]));
$('removeVideo').onclick=()=>{$('preview').pause();$('preview').removeAttribute('src');$('preview').load();videoFile=null;$('fileInfo').classList.add('hidden');$('previewPlaceholder').classList.remove('hidden');$('convertBtn').disabled=true;$('durationLabel').textContent='動画を読み込んでください';for(const id of ['startRange','endRange','startNumber','endNumber'])$(id).disabled=true;clearResult()};
for(const [id,which] of [['startRange','start'],['endRange','end']])$(id).addEventListener('input',()=>{clampRanges(which);clearResult()});
for(const [id,which] of [['startNumber','start'],['endNumber','end']])$(id).addEventListener('change',()=>{$(which==='start'?'startRange':'endRange').value=$(id).value;clampRanges(which);clearResult()});
$('fps').oninput=()=> $('fpsOut').value=$('fps').value+' FPS';
$('speed').oninput=()=> $('speedOut').value=Number($('speed').value).toFixed(1)+'x';
for(const ev of ['dragenter','dragover'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')});
for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')});
drop.addEventListener('drop',e=>setVideo(e.dataTransfer.files[0]));
async function loadEngine(){if(loaded)return;$('engineText').textContent='変換エンジンを読み込み中…（初回は時間がかかります）';ffmpeg.on('progress',({progress})=>{if(Number.isFinite(progress)){const pct=Math.round(Math.max(0,Math.min(1,progress))*100);$('progressBar').style.width=pct+'%';$('progressPct').textContent=pct+'%'}});const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';await ffmpeg.load({coreURL:await toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(base+'/ffmpeg-core.wasm','application/wasm')});loaded=true;$('engineText').textContent='変換エンジン準備完了'}
$('convertBtn').onclick=async()=>{if(!videoFile)return;const myJob=++job;cancelRequested=false;$('convertBtn').disabled=true;$('errorBox').classList.add('hidden');clearResult();$('progressArea').classList.remove('hidden');$('progressBar').style.width='0%';$('progressPct').textContent='0%';$('progressText').textContent='変換エンジンを準備中…';try{await loadEngine();if(myJob!==job)return;$('progressText').textContent='動画を変換しています…';const ext=(videoFile.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');const inName='input.'+ext,outName='output.gif';await ffmpeg.writeFile(inName,new Uint8Array(await videoFile.arrayBuffer()));const start=Number($('startRange').value),end=Number($('endRange').value),duration=end-start;if(duration<=0)throw new Error('終了時間は開始時間より後に設定してください。');const fps=Number($('fps').value),speed=Number($('speed').value),width=$('width').value,colors=Number($('colors').value);const scale=width==='source'?'scale=trunc(iw/2)*2:-1':'scale='+width+':-1';const filter='[0:v]fps='+fps+','+scale+':flags=lanczos,setpts=PTS/'+speed+',split[a][b];[a]palettegen=max_colors='+colors+'[p];[b][p]paletteuse=dither=sierra2_4a';const args=['-ss',String(start),'-t',String(duration),'-i',inName,'-filter_complex',filter,'-loop',$('loop').checked?'0':'-1',outName];const exitCode=await ffmpeg.exec(args);if(exitCode!==0)throw new Error('FFmpeg returned exit code '+exitCode);if(myJob!==job||cancelRequested)return;const data=await ffmpeg.readFile(outName);resultUrl=URL.createObjectURL(new Blob([data.buffer],{type:'image/gif'}));$('gifPreview').src=resultUrl;$('downloadBtn').href=resultUrl;$('downloadBtn').download='aevmotion-'+Date.now()+'.gif';$('resultMeta').textContent=size(data.length);$('result').classList.remove('hidden');$('progressText').textContent='変換完了';$('progressBar').style.width='100%';$('progressPct').textContent='100%';try{await ffmpeg.deleteFile(inName);await ffmpeg.deleteFile(outName)}catch{} }catch(err){if(myJob===job&&!cancelRequested)setError('変換に失敗しました。動画形式や長さを確認して、もう一度お試しください。詳細: '+(err?.message||String(err)).slice(0,220))}finally{if(myJob===job){$('convertBtn').disabled=!videoFile;if(cancelRequested)$('progressText').textContent='キャンセルしました'}}};
$('cancelBtn').onclick=()=>{cancelRequested=true;job++;$('progressArea').classList.add('hidden');$('convertBtn').disabled=!videoFile;try{ffmpeg.terminate()}catch{}loaded=false;$('engineText').textContent='キャンセルされました。次回変換時にエンジンを再読み込みします'};

/* Batch image upscaler: sequential processing, max five images. */
const imageInput=$('imageInput');
const MAX_IMAGES=5;
let selectedImages=[],upscaleBusy=false,upscaleUrls=[];
const imageDrop=$('imageDropzone');
function clearUpscaleResults(){
  for(const url of upscaleUrls)URL.revokeObjectURL(url);
  upscaleUrls=[];
  $('upscaleResults').replaceChildren();
}
function updateImageQueue(){
  $('imageQueueCount').textContent=selectedImages.length+'枚選択中';
  $('imageQueueInfo').classList.toggle('hidden',selectedImages.length===0);
  $('upscaleControls').classList.toggle('hidden',selectedImages.length===0);
  $('upscaleBtn').disabled=selectedImages.length===0||upscaleBusy;
}
function addImages(files){
  if(upscaleBusy)return;
  const incoming=[...files].filter(f=>f.type.startsWith('image/'));
  if([...files].length!==incoming.length){$('upscaleError').textContent='画像以外のファイルは除外しました。';$('upscaleError').classList.remove('hidden')}
  const merged=[...selectedImages];
  for(const file of incoming){
    if(merged.length>=MAX_IMAGES)break;
    if(file.size>30*1024*1024){$('upscaleError').textContent='30MBを超える画像「'+file.name+'」は追加できません。';$('upscaleError').classList.remove('hidden');continue}
    if(!merged.some(x=>x.name===file.name&&x.size===file.size&&x.lastModified===file.lastModified))merged.push(file);
  }
  if(incoming.length&&merged.length===selectedImages.length&&selectedImages.length>=MAX_IMAGES){$('upscaleError').textContent='一度に選択できる画像は最大5枚です。';$('upscaleError').classList.remove('hidden')}
  else if(merged.length>0&&incoming.length)$('upscaleError').classList.add('hidden');
  selectedImages=merged.slice(0,MAX_IMAGES);
  clearUpscaleResults();
  updateImageQueue();
}
imageInput.addEventListener('change',e=>{addImages(e.target.files);imageInput.value=''});
$('clearImages').onclick=()=>{if(upscaleBusy)return;selectedImages=[];clearUpscaleResults();$('upscaleError').classList.add('hidden');updateImageQueue()};
for(const ev of ['dragenter','dragover'])imageDrop.addEventListener(ev,e=>{e.preventDefault();imageDrop.classList.add('drag')});
for(const ev of ['dragleave','drop'])imageDrop.addEventListener(ev,e=>{e.preventDefault();imageDrop.classList.remove('drag')});
imageDrop.addEventListener('drop',e=>addImages(e.dataTransfer.files));
function outputName(name,ext){const base=name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]/g,'_').slice(0,80)||'image';return 'aevmotion-'+base+'-upscaled.'+ext}
function addResultCard(file,url,w,h,blob,ext){
  const card=document.createElement('article');card.className='upscale-result-card';
  const heading=document.createElement('div');heading.className='result-head';
  const title=document.createElement('strong');title.textContent=file.name;
  const meta=document.createElement('span');meta.textContent=w+' × '+h+' px · '+size(blob.size);
  heading.append(title,meta);
  const preview=document.createElement('img');preview.src=url;preview.alt=file.name+' の高解像度化結果';
  const open=document.createElement('a');open.className='download-btn secondary-download';open.href=url;open.target='_blank';open.rel='noopener noreferrer';open.textContent='↗ 新しいタブで開く';
  const save=document.createElement('a');save.className='download-btn';save.href=url;save.download=outputName(file.name,ext);save.textContent='↓ この画像を保存';
  card.append(heading,preview,open,save);$('upscaleResults').append(card);
}
async function upscaleOne(file,factor,mime){
  const bitmap=await createImageBitmap(file);
  try{
    const w=bitmap.width*factor,h=bitmap.height*factor;
    if(w>12000||h>12000||w*h>40000000)throw new Error('拡大後が上限（40メガピクセル）を超えています');
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvasを利用できません');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,w,h);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,mime==='image/jpeg'?0.92:undefined));
    if(!blob)throw new Error('画像を書き出せませんでした');
    const url=URL.createObjectURL(blob);upscaleUrls.push(url);
    const ext=mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png';
    addResultCard(file,url,w,h,blob,ext);
    canvas.width=0;canvas.height=0;
  }finally{bitmap.close()}
}
$('upscaleFactor').addEventListener('change',clearUpscaleResults);
$('upscaleFormat').addEventListener('change',clearUpscaleResults);
$('upscaleBtn').onclick=async()=>{
  if(!selectedImages.length||upscaleBusy)return;
  upscaleBusy=true;clearUpscaleResults();$('upscaleError').classList.add('hidden');$('upscaleProgress').classList.remove('hidden');$('upscaleProgressBar').style.width='0%';$('upscaleProgressPct').textContent='0%';updateImageQueue();
  const files=[...selectedImages],factor=Number($('upscaleFactor').value),mime=$('upscaleFormat').value;
  let succeeded=0,failed=[];
  for(let i=0;i<files.length;i++){
    $('upscaleProgressText').textContent=(i+1)+' / '+files.length+' 枚目を処理中：'+files[i].name;
    try{await upscaleOne(files[i],factor,mime);succeeded++}
    catch(err){failed.push(files[i].name+'：'+(err?.message||'処理に失敗しました'))}
    const pct=Math.round((i+1)/files.length*100);$('upscaleProgressBar').style.width=pct+'%';$('upscaleProgressPct').textContent=pct+'%';
  }
  $('upscaleProgressText').textContent='完了：'+succeeded+'枚成功'+(failed.length?'・'+failed.length+'枚失敗':'');
  if(failed.length){$('upscaleError').textContent=failed.join(' / ');$('upscaleError').classList.remove('hidden')}
  else $('upscaleError').classList.add('hidden');
  upscaleBusy=false;updateImageQueue();
};
updateImageQueue();
