import { FFmpeg } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js';
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
async function loadEngine(){if(loaded)return;$('engineText').textContent='変換エンジンを読み込み中…（初回は時間がかかります）';ffmpeg.on('progress',({progress})=>{if(Number.isFinite(progress)){$('progressBar').style.width=Math.max(0,Math.min(100,progress*100))+'%';$('progressPct').textContent=Math.round(progress*100)+'%'}});const base='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';await ffmpeg.load({classWorkerURL:await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js','text/javascript'),coreURL:await toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(base+'/ffmpeg-core.wasm','application/wasm')});loaded=true;$('engineText').textContent='変換エンジン準備完了'}
$('convertBtn').onclick=async()=>{if(!videoFile)return;const myJob=++job;cancelRequested=false;$('convertBtn').disabled=true;$('errorBox').classList.add('hidden');clearResult();$('progressArea').classList.remove('hidden');$('progressBar').style.width='0%';$('progressPct').textContent='0%';$('progressText').textContent='変換エンジンを準備中…';try{await loadEngine();if(myJob!==job)return;$('progressText').textContent='動画を変換しています…';const ext=(videoFile.name.split('.').pop()||'mp4').toLowerCase().replace(/[^a-z0-9]/g,'');const inName='input.'+ext,outName='output.gif';await ffmpeg.writeFile(inName,new Uint8Array(await videoFile.arrayBuffer()));const start=Number($('startRange').value),end=Number($('endRange').value),duration=end-start;if(duration<=0)throw new Error('終了時間は開始時間より後に設定してください。');const fps=Number($('fps').value),speed=Number($('speed').value),width=$('width').value,colors=Number($('colors').value);const scale=width==='source'?'scale=trunc(iw/2)*2:-1':'scale='+width+':-1';const filter='[0:v]fps='+fps+','+scale+':flags=lanczos,setpts=PTS/'+speed+',split[a][b];[a]palettegen=max_colors='+colors+'[p];[b][p]paletteuse=dither=sierra2_4a';const args=['-ss',String(start),'-t',String(duration),'-i',inName,'-filter_complex',filter,'-loop',$('loop').checked?'0':'-1',outName];const exitCode=await ffmpeg.exec(args);if(exitCode!==0)throw new Error('FFmpeg returned exit code '+exitCode);if(myJob!==job||cancelRequested)return;const data=await ffmpeg.readFile(outName);resultUrl=URL.createObjectURL(new Blob([data.buffer],{type:'image/gif'}));$('gifPreview').src=resultUrl;$('downloadBtn').href=resultUrl;$('downloadBtn').download='aevmotion-'+Date.now()+'.gif';$('resultMeta').textContent=size(data.length);$('result').classList.remove('hidden');$('progressText').textContent='変換完了';$('progressBar').style.width='100%';$('progressPct').textContent='100%';try{await ffmpeg.deleteFile(inName);await ffmpeg.deleteFile(outName)}catch{} }catch(err){if(myJob===job&&!cancelRequested)setError('変換に失敗しました。動画形式や長さを確認して、もう一度お試しください。詳細: '+(err?.message||String(err)).slice(0,220))}finally{if(myJob===job){$('convertBtn').disabled=!videoFile;if(cancelRequested)$('progressText').textContent='キャンセルしました'}}};
$('cancelBtn').onclick=()=>{cancelRequested=true;job++;$('progressArea').classList.add('hidden');$('convertBtn').disabled=!videoFile;try{ffmpeg.terminate()}catch{}loaded=false;$('engineText').textContent='キャンセルされました。次回変換時にエンジンを再読み込みします'};

/* Single-image resolution upscaler: all processing stays in this browser. */
let sourceImage=null,sourceImageUrl=null,upscaledUrl=null;
const imageInput=$('imageInput');
function clearUpscaleResult(){if(upscaledUrl)URL.revokeObjectURL(upscaledUrl);upscaledUrl=null;$('upscaleResult').classList.add('hidden')}
function loadSingleImage(file){
  if(!file)return;
  if(!file.type.startsWith('image/')){$('upscaleError').textContent='画像ファイルを選択してください。';$('upscaleError').classList.remove('hidden');return}
  if(file.size>30*1024*1024){$('upscaleError').textContent='ファイルサイズが30MBを超えています。より小さい画像を選択してください。';$('upscaleError').classList.remove('hidden');return}
  if(sourceImageUrl)URL.revokeObjectURL(sourceImageUrl);
  clearUpscaleResult();sourceImage=file;sourceImageUrl=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{sourceImage=img;$('imageName').textContent=file.name;$('imageDimensions').textContent=img.naturalWidth+' × '+img.naturalHeight+' px · '+size(file.size);$('imageInfo').classList.remove('hidden');$('upscaleControls').classList.remove('hidden');$('upscaleError').classList.add('hidden')};
  img.onerror=()=>{$('upscaleError').textContent='この画像を読み込めませんでした。別の画像をお試しください。';$('upscaleError').classList.remove('hidden')};
  img.src=sourceImageUrl;
}
imageInput.addEventListener('change',e=>loadSingleImage(e.target.files[0]));
$('removeImage').onclick=()=>{if(sourceImageUrl)URL.revokeObjectURL(sourceImageUrl);sourceImage=null;sourceImageUrl=null;imageInput.value='';$('imageInfo').classList.add('hidden');$('upscaleControls').classList.add('hidden');$('upscaleError').classList.add('hidden');clearUpscaleResult()};
const imageDrop=$('imageDropzone');
for(const ev of ['dragenter','dragover'])imageDrop.addEventListener(ev,e=>{e.preventDefault();imageDrop.classList.add('drag')});
for(const ev of ['dragleave','drop'])imageDrop.addEventListener(ev,e=>{e.preventDefault();imageDrop.classList.remove('drag')});
imageDrop.addEventListener('drop',e=>loadSingleImage(e.dataTransfer.files[0]));
$('upscaleFactor').addEventListener('change',clearUpscaleResult);
$('upscaleFormat').addEventListener('change',clearUpscaleResult);
$('upscaleBtn').onclick=()=>{
  if(!sourceImage||!sourceImage.naturalWidth)return;
  clearUpscaleResult();$('upscaleError').classList.add('hidden');
  const factor=Number($('upscaleFactor').value),w=sourceImage.naturalWidth*factor,h=sourceImage.naturalHeight*factor;
  if(w>12000||h>12000||w*h>40000000){$('upscaleError').textContent='拡大後の画像が大きすぎます。倍率を下げるか、元画像の小さい画像を使用してください。';$('upscaleError').classList.remove('hidden');return}
  try{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvasを利用できません');
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(sourceImage,0,0,w,h);
    const mime=$('upscaleFormat').value;
    canvas.toBlob(blob=>{
      if(!blob){$('upscaleError').textContent='画像を書き出せませんでした。形式を変更してお試しください。';$('upscaleError').classList.remove('hidden');return}
      upscaledUrl=URL.createObjectURL(blob);$('upscalePreview').src=upscaledUrl;
      const ext=mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'png';
      $('upscaleOpenNewTab').href=upscaledUrl;$('upscaleDownload').href=upscaledUrl;$('upscaleDownload').download='aevmotion-upscaled-'+w+'x'+h+'.'+ext;
      $('upscaleResultMeta').textContent=w+' × '+h+' px · '+size(blob.size);$('upscaleResult').classList.remove('hidden');
    },mime,mime==='image/jpeg'?0.92:undefined);
  }catch(err){$('upscaleError').textContent='高解像度化に失敗しました。画像サイズを小さくしてお試しください。';$('upscaleError').classList.remove('hidden')}
};
