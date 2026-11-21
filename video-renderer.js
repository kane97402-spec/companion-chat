(function(){
"use strict";

const WIDTH=1280, HEIGHT=720;
const COLORS={bg:"#100d18",panel:"#1d1728",panel2:"#2a2038",purple:"#c6a8ff",white:"#f7f2ff",muted:"#c0b6d0",green:"#9de3c0",gold:"#f6d68b"};

function roundedRect(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
}
function wrapLines(ctx,text,maxWidth){
  const words=String(text||"").split(/\s+/),lines=[];let line="";
  for(const word of words){const test=line?line+" "+word:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word}else line=test}
  if(line)lines.push(line);return lines;
}
function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){
  const lines=wrapLines(ctx,text,maxWidth).slice(0,maxLines||8);
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));
  return lines.length*lineHeight;
}
function arrow(ctx,x1,y1,x2,y2,color){
  const a=Math.atan2(y2-y1,x2-x1),head=12;
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(a-.5),y2-head*Math.sin(a-.5));ctx.lineTo(x2-head*Math.cos(a+.5),y2-head*Math.sin(a+.5));ctx.closePath();ctx.fill();
}
function drawNode(ctx,x,y,w,h,label,accent){
  roundedRect(ctx,x,y,w,h,16,"#30243f",accent||"#68528a");
  ctx.fillStyle=COLORS.white;ctx.font="600 22px Inter,Arial,sans-serif";ctx.textAlign="center";
  const lines=wrapLines(ctx,label,w-26).slice(0,2);
  lines.forEach((line,i)=>ctx.fillText(line,x+w/2,y+h/2+(i-(lines.length-1)/2)*27+8));
}
function drawDiagram(ctx,slide,topic){
  const lower=(topic+" "+slide.title+" "+(slide.bullets||[]).join(" ")).toLowerCase();
  roundedRect(ctx,54,250,850,330,24,"#191522","#40334f");
  ctx.textAlign="left";ctx.fillStyle=COLORS.purple;ctx.font="700 16px Inter,Arial,sans-serif";
  ctx.fillText("VISUAL SUMMARY",82,286);
  if(/photosynth|plant|chlorophyll|chloroplast/.test(lower)){
    ctx.textAlign="center";ctx.font="700 18px Inter,Arial,sans-serif";
    drawNode(ctx,92,345,170,82,"Sunlight",COLORS.gold);
    drawNode(ctx,92,455,170,82,"Water + CO₂",COLORS.green);
    drawNode(ctx,390,390,205,105,"LEAF\nCHLOROPLAST",COLORS.purple);
    drawNode(ctx,700,345,160,82,"Glucose",COLORS.gold);
    drawNode(ctx,700,455,160,82,"Oxygen",COLORS.green);
    arrow(ctx,262,386,390,425,COLORS.gold);arrow(ctx,262,495,390,465,COLORS.green);
    arrow(ctx,595,425,700,386,COLORS.gold);arrow(ctx,595,465,700,495,COLORS.green);
    ctx.fillStyle=COLORS.muted;ctx.font="16px Inter,Arial,sans-serif";ctx.fillText("Inputs",176,326);ctx.fillText("Outputs",780,326);
  }else{
    const bullets=(slide.bullets||[]).slice(0,3);
    const labels=bullets.length?bullets:[slide.title||topic,"Key idea","Result"];
    const nodeW=220,nodeH=105,gap=48,total=labels.length*nodeW+(labels.length-1)*gap,start=(WIDTH-300-total)/2+50;
    labels.forEach((label,i)=>{
      const x=Math.max(82,Math.min(650,start+i*(nodeW+gap)));
      drawNode(ctx,x,380,nodeW,nodeH,label,i===1?COLORS.green:COLORS.purple);
      if(i<labels.length-1)arrow(ctx,x+nodeW+4,432,x+nodeW+gap-7,432,COLORS.purple);
    });
    ctx.textAlign="center";ctx.fillStyle=COLORS.muted;ctx.font="17px Inter,Arial,sans-serif";
    ctx.fillText("Follow the ideas from left to right",480,535);
  }
}
function drawFrame(ctx,lesson,teacher,index,portrait,elapsed){
  const slide=lesson.slides[index],topic=lesson.title||"Study lesson";
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  const grad=ctx.createLinearGradient(0,0,WIDTH,HEIGHT);grad.addColorStop(0,"#171020");grad.addColorStop(1,"#0d0b13");
  ctx.fillStyle=grad;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle=COLORS.purple;ctx.font="700 17px Inter,Arial,sans-serif";ctx.textAlign="left";
  ctx.fillText("COMPANION.  /  VIDEO LESSON",56,54);
  ctx.fillStyle=COLORS.muted;ctx.textAlign="right";ctx.font="600 17px Inter,Arial,sans-serif";
  ctx.fillText("SCENE "+(index+1)+" / "+lesson.slides.length,1220,54);
  roundedRect(ctx,56,78,1168,5,3,"#40334f");
  roundedRect(ctx,56,78,1168*(index+1)/lesson.slides.length,5,3,COLORS.purple);
  ctx.textAlign="left";ctx.fillStyle=COLORS.white;ctx.font="700 42px Inter,Arial,sans-serif";
  drawWrapped(ctx,slide.title||topic,58,151,1080,50,2);
  ctx.fillStyle=COLORS.muted;ctx.font="19px Inter,Arial,sans-serif";
  drawWrapped(ctx,lesson.subtitle||"A character-led study lesson",60,205,1080,27,1);
  drawDiagram(ctx,slide,topic);
  roundedRect(ctx,54,598,850,80,18,"#211a2d","#40334f");
  ctx.fillStyle=COLORS.white;ctx.font="600 19px Inter,Arial,sans-serif";ctx.textAlign="left";
  const bulletText=(slide.bullets||[]).slice(0,2).join("   •   ");
  drawWrapped(ctx,bulletText||slide.narration,78,630,800,25,2);
  // Character presenter stays in the bottom-right corner throughout the lesson.
  roundedRect(ctx,952,330,270,348,22,"#211a2d","#8064aa");
  if(portrait&&portrait.complete&&portrait.naturalWidth){
    ctx.save();ctx.beginPath();ctx.moveTo(970,348);ctx.lineTo(1204,348);ctx.lineTo(1204,626);ctx.lineTo(970,626);ctx.closePath();ctx.clip();
    const scale=Math.max(234/portrait.naturalWidth,278/portrait.naturalHeight),w=portrait.naturalWidth*scale,h=portrait.naturalHeight*scale;
    ctx.drawImage(portrait,1087-w/2,487-h/2,w,h);ctx.restore();
  }else{
    ctx.fillStyle="#49345f";ctx.beginPath();ctx.arc(1087,470,74,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=COLORS.white;ctx.textAlign="center";ctx.font="700 43px Inter,Arial,sans-serif";
    const initials=String(teacher.name||"AI").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();ctx.fillText(initials,1087,485);
  }
  roundedRect(ctx,970,630,234,32,10,"#342543");
  ctx.fillStyle=COLORS.white;ctx.font="600 15px Inter,Arial,sans-serif";ctx.textAlign="center";
  ctx.fillText(String(teacher.name||"Your teacher").slice(0,27),1087,652);
  // A subtle progress pulse gives the exported scene a little motion.
  ctx.fillStyle=COLORS.purple;ctx.globalAlpha=.35+.25*Math.sin(elapsed/320);ctx.beginPath();ctx.arc(920,640,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
}
function loadPortrait(teacher){
  return new Promise(resolve=>{
    const p={name:teacher.name,query:teacher.query||""};
    if(!p.name||p.name==="companion.")return resolve(null);
    const cached=(()=>{try{return JSON.parse(localStorage.getItem("companion_portraits_v3")||"{}")[p.name]}catch{return ""}})();
    if(!cached)return resolve(null);
    const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=cached;
  });
}
async function getSpeechBuffers(state,ctx,onProgress){
  const endpoint=(()=>{let raw=localStorage.getItem("companion_ai_endpoint_v1")||"";try{raw=JSON.parse(raw)}catch{}return String(raw||"").replace(/\/+$/,"")})();
  if(!endpoint)throw new Error("Connect your Cloudflare Worker in About & privacy before exporting narrated video.");
  const buffers=[];
  for(let i=0;i<state.lesson.slides.length;i++){
    onProgress("Generating narration "+(i+1)+" of "+state.lesson.slides.length+"…");
    const response=await fetch(endpoint+"/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:state.lesson.slides[i].narration,speaker:state.voice})});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||"Could not generate narration for scene "+(i+1)+".")}
    const bytes=await response.arrayBuffer();
    buffers.push(await ctx.decodeAudioData(bytes.slice(0)));
  }
  return buffers;
}
function chooseMimeType(){
  if(!window.MediaRecorder)return "";
  const types=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  return types.find(type=>MediaRecorder.isTypeSupported(type))||"";
}
async function exportLesson(host,button,state){
  if(!state||!state.lesson||!Array.isArray(state.lesson.slides))throw new Error("Generate a lesson before exporting.");
  if(state.exportBusy)return;
  if(!HTMLCanvasElement.prototype.captureStream)throw new Error("This browser cannot record canvas video. Try the latest Chrome or Edge on your Mac.");
  const mimeType=chooseMimeType();if(!mimeType)throw new Error("Video recording is not supported in this browser. Try the latest Chrome or Edge.");
  state.exportBusy=true;button.disabled=true;button.textContent="Preparing video…";
  const status=state.exportStatus;
  const setStatus=message=>{if(status&&status.isConnected)status.textContent=message};
  let audioContext=null,recorder=null,animation=0,canvasStream=null,objectUrl=null;
  try{
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)throw new Error("Audio recording is not supported in this browser.");
    audioContext=new AudioContextClass();
    await audioContext.resume();
    const buffers=await getSpeechBuffers(state,audioContext,setStatus);
    const portrait=await loadPortrait(state.teacher);
    const canvas=document.createElement("canvas");canvas.width=WIDTH;canvas.height=HEIGHT;
    const ctx=canvas.getContext("2d");
    const videoStream=canvas.captureStream(30),audioDestination=audioContext.createMediaStreamDestination();
    const combined=new MediaStream([...videoStream.getVideoTracks(),...audioDestination.stream.getAudioTracks()]);
    canvasStream=videoStream;
    const chunks=[];
    recorder=new MediaRecorder(combined,{mimeType,videoBitsPerSecond:3500000,audioBitsPerSecond:128000});
    recorder.ondataavailable=event=>{if(event.data&&event.data.size)chunks.push(event.data)};
    const stopped=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(new Error("The browser stopped recording unexpectedly."))});
    recorder.start(1000);
    for(let i=0;i<buffers.length;i++){
      setStatus("Rendering scene "+(i+1)+" of "+buffers.length+"…");
      const source=audioContext.createBufferSource();source.buffer=buffers[i];source.connect(audioDestination);
      const started=performance.now();
      const animate=now=>{drawFrame(ctx,state.lesson,state.teacher,i,portrait,now-started);animation=requestAnimationFrame(animate)};
      drawFrame(ctx,state.lesson,state.teacher,i,portrait,0);animation=requestAnimationFrame(animate);
      await new Promise((resolve,reject)=>{source.onended=resolve;source.start();});
      cancelAnimationFrame(animation);animation=0;
      await new Promise(resolve=>setTimeout(resolve,180));
    }
    setStatus("Finishing your video…");
    recorder.stop();await stopped;
    const blob=new Blob(chunks,{type:recorder.mimeType||mimeType});
    if(!blob.size)throw new Error("The video file was empty. Please try again.");
    objectUrl=URL.createObjectURL(blob);
    const filename=(state.lesson.title||"companion-lesson").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,55)||"companion-lesson";
    const old=host.querySelector(".lesson-download-link");if(old)old.remove();
    const link=document.createElement("a");link.className="primary lesson-download-link";link.href=objectUrl;link.download=filename+".webm";link.textContent="↓ Download video (.webm)";
    const controls=host.querySelector(".lesson-controls");if(controls)controls.append(link);
    setStatus("Video ready · 720p WebM · "+Math.round(blob.size/1024/1024*10)/10+" MB. Download it to your device.");
    button.textContent="✓ Video created";
  }catch(error){
    setStatus(error.message||"Video export failed.");
    button.textContent="↓ Export video";
    throw error;
  }finally{
    if(animation)cancelAnimationFrame(animation);
    if(recorder&&recorder.state!=="inactive"){try{recorder.stop()}catch{}}
    if(canvasStream)canvasStream.getTracks().forEach(track=>track.stop());
    if(audioContext){try{await audioContext.close()}catch{}}
    state.exportBusy=false;button.disabled=false;
    if(button.textContent==="Preparing video…"||button.textContent==="Rendering video…")button.textContent="↓ Export video";
  }
}
window.exportCompanionLessonVideo=function(host,button,state){
  exportLesson(host,button,state).catch(error=>{if(typeof window.toast==="function")window.toast(error.message||"Could not export video.");else console.error(error)});
};
})();