"use strict";

const $=id=>document.getElementById(id);
const ui={
 status:$("status"),start:$("startBtn"),calibrate:$("calibrateBtn"),stop:$("stopBtn"),demo:$("demoBtn"),journey:$("journeyBtn"),
 quality:$("qualityBtn"),record:$("recordBtn"),downloadLog:$("downloadLogBtn"),
 speed:$("speed"),speedMusic:$("speedMusicState"),speedMusicTrack:$("speedMusicTrack"),energy:$("energyLabel"),energyTrack:$("energyTrack"),
 section:$("sectionState"),mode:$("modeLabel"),bar:$("barLabel"),road:$("roadState"),roadHelp:$("roadModeHelp"),
 accel:$("accelMeter"),brake:$("brakeMeter"),turn:$("turnMeter"),music:$("musicMeter"),
 accelValue:$("accelValue"),brakeValue:$("brakeValue"),turnValue:$("turnValue"),musicValue:$("musicValue"),
 chord:$("chordState"),bass:$("bassState"),drum:$("drumState"),arp:$("arpState"),filter:$("filterState"),variation:$("variationState"),idle:$("idleState"),swirl:$("swirlState"),thrust:$("thrustState"),
 agentGrid:$("agentGrid"),
 responsiveness:$("responsiveness"),accelSensitivity:$("accelSensitivity"),turnSensitivity:$("turnSensitivity"),
 responsivenessValue:$("responsivenessValue"),accelSensitivityValue:$("accelSensitivityValue"),turnSensitivityValue:$("turnSensitivityValue"),
 helpModal:$("helpModal"),helpTitle:$("helpTitle"),helpText:$("helpText"),helpRecommendation:$("helpRecommendation"),closeHelp:$("closeHelpBtn"),
 calibrationState:$("calibrationState"),motionX:$("motionXState"),motionY:$("motionYState"),motionZ:$("motionZState"),
 imuLong:$("imuLongState"),imuLat:$("imuLatState"),gpsAccel:$("gpsAccelState"),yawRate:$("yawRateState"),headingRate:$("headingRateState"),
 motionHz:$("motionHzState"),audioMode:$("audioModeState"),thrustJerk:$("thrustJerkState"),thrustLevel:$("thrustLevelState"),
 trackSelect:$("trackSelect"),previousTrack:$("previousTrackBtn"),nextTrack:$("nextTrackBtn"),
 trackTitle:$("trackTitle"),trackEdition:$("trackEdition"),trackArtist:$("trackArtist"),
 trackSwitchState:$("trackSwitchState"),musicAttribution:$("musicAttribution"),
 desktopSimBtn:$("desktopSimBtn"),desktopSimPanel:$("desktopSimulatorPanel"),desktopSimState:$("desktopSimState"),
 simSpeed:$("simSpeed"),simSpeedValue:$("simSpeedValue"),simAccel:$("simAccel"),simAccelValue:$("simAccelValue"),
 simBrake:$("simBrake"),simBrakeValue:$("simBrakeValue"),simTurn:$("simTurn"),simTurnValue:$("simTurnValue"),
 simLinkPedals:$("simLinkPedals"),simResetSignals:$("simResetSignals"),simLiveState:$("simLiveState")
};

const LIBRARY_URL="audio/library.json";
let BPM=120;
let BEAT_DURATION=60/BPM;
let BAR_DURATION=BEAT_DURATION*4;
let LOOP_DURATION=BAR_DURATION*8;
let TRACK_DURATION=LOOP_DURATION;
let TRACK_CROSSFADE=.75;
const SCHEDULE_AHEAD=.72;
const ENGINE_INTERVAL=50;
let speedRatio=0;

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const lowPass=(oldValue,newValue,amount=.12)=>oldValue+amount*(newValue-oldValue);
const followEnvelope=(current,target,dt,attack=.08,release=.55)=>{
 const tau=target>current?attack:release;
 const amount=1-Math.exp(-Math.max(.001,dt)/Math.max(.01,tau));
 return lowPass(current,target,amount);
};
const smoothstep=(edge0,edge1,value)=>{
 const x=clamp((value-edge0)/(edge1-edge0));
 return x*x*(3-2*x);
};
const mod=(value,divisor)=>((value%divisor)+divisor)%divisor;
const finite=value=>Number.isFinite(Number(value))?Number(value):0;
const formatClock=seconds=>{
 const total=Math.max(0,Math.floor(finite(seconds)));
 const minutes=Math.floor(total/60);
 const secs=total%60;
 return `${minutes}:${String(secs).padStart(2,"0")}`;
};

const vec=(x=0,y=0,z=0)=>({x,y,z});
const add=(a,b)=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
const scale=(a,s)=>vec(a.x*s,a.y*s,a.z*s);
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>vec(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x);
const length=a=>Math.hypot(a.x,a.y,a.z);
const normalize=(a,fallback=vec(0,0,1))=>{
 const size=length(a);
 return size>.0001?scale(a,1/size):fallback;
};
const projectToPlane=(a,normal)=>add(a,scale(normal,-dot(a,normal)));
const meanVector=samples=>samples.length?scale(samples.reduce((sum,item)=>add(sum,item),vec()),1/samples.length):vec();
const wrapDegrees=value=>((value+180)%360+360)%360-180;

const ROAD_PROFILES={
 city:{label:"Ville",maxSpeed:50,help:"Référence 50 km/h",grooveRatio:.38,chorusRatio:1.04,finaleRatio:1.14},
 country:{label:"Campagne",maxSpeed:80,help:"Référence 80 km/h",grooveRatio:.34,chorusRatio:.92,finaleRatio:1.04},
 highway:{label:"Autoroute",maxSpeed:130,help:"Référence 130 km/h",grooveRatio:.30,chorusRatio:.86,finaleRatio:.96}
};

const SCENE_LABELS={
 intro:"Intro",groove:"Groove",drive:"Montée",breakdown:"Respiration",chorus:"Refrain",finale:"Finale"
};


const ARRANGEMENT_PROFILES={
 drive:{label:"Original Drive",sceneMap:{intro:"intro",groove:"groove",drive:"drive",breakdown:"breakdown",chorus:"chorus",finale:"finale"},busMultipliers:{rhythm:1,tops:1,bass:1,harmony:1,piano:1,lead:1,fx:1}},
 night:{label:"Night Drive",sceneMap:{intro:"breakdown",groove:"intro",drive:"groove",breakdown:"breakdown",chorus:"drive",finale:"chorus"},busMultipliers:{rhythm:.86,tops:.84,bass:1.06,harmony:1.14,piano:.96,lead:.90,fx:1.14}},
 space:{label:"Space Drive",sceneMap:{intro:"intro",groove:"groove",drive:"drive",breakdown:"breakdown",chorus:"chorus",finale:"finale"},busMultipliers:{rhythm:.94,tops:1.08,bass:1.02,harmony:1.10,piano:1.05,lead:1.04,fx:1.14}},
 relaxed:{label:"Relaxed Drive",sceneMap:{intro:"intro",groove:"groove",drive:"drive",breakdown:"breakdown",chorus:"chorus",finale:"finale"},busMultipliers:{rhythm:.86,tops:.88,bass:1.02,harmony:1.13,piano:.96,lead:.94,fx:.90}},
 swing:{label:"Electro Swing",sceneMap:{intro:"intro",groove:"groove",drive:"drive",breakdown:"breakdown",chorus:"chorus",finale:"finale"},busMultipliers:{rhythm:1.03,tops:1.02,bass:1.00,harmony:1.04,piano:1,lead:1.10,fx:.85}},
 rock:{label:"Rock Boost",sceneMap:{intro:"intro",groove:"groove",drive:"drive",breakdown:"breakdown",chorus:"chorus",finale:"finale"},busMultipliers:{rhythm:1.08,tops:1,bass:1.04,harmony:1.10,piano:1.06,lead:1.12,fx:1.04}}
};

const BUSES=[
 {id:"rhythm",emoji:"🥁",name:"RHYTHM",role:"Kick, snare & rim",description:"Entre vers 20 % d’énergie · plein vers 62 % · prochain temps",color:"#ff5d67",timing:"beat"},
 {id:"tops",emoji:"✨",name:"TOPS",role:"Hi-hats & percussions",description:"Accélération, virages ou énergie > 38 % · prochain temps",color:"#ffc13d",timing:"beat"},
 {id:"bass",emoji:"🔊",name:"BASS",role:"Sub & basses mélodiques",description:"Entre vers 26 % d’énergie · plein vers 62 % · prochaine mesure",color:"#25c5ff",timing:"bar"},
 {id:"harmony",emoji:"☁️",name:"HARMONY",role:"Pads, textures & guitare",description:"Fond permanent sans Rhodes · niveau renforcé",color:"#f06ec7",timing:"immediate"},
 {id:"piano",emoji:"⚡",name:"ACCENT",role:"Stem spécial du morceau",description:"Rôle défini par le manifeste du titre",color:"#66d7ff",timing:"immediate"},
 {id:"lead",emoji:"🎶",name:"LEAD",role:"Pluck & synth lead",description:"Entre vers 56 % d’énergie · prochaine mesure",color:"#dc65d9",timing:"bar"},
 {id:"fx",emoji:"🌊",name:"FX",role:"Risers & impacts",description:"Accélération, freinage et changement de scène",color:"#a853f2",timing:"immediate"}
];

const SWIRL_CHARACTER={
 id:"swirl",emoji:"🌀",name:"SWIRL",role:"Effet spatial de virage",
 description:"Reverb + delay spatial activés par les courbes",color:"#69e5ff",timing:"immediate",virtual:true
};
const THRUST_CHARACTER={
 id:"thrust",emoji:"🚀",name:"THRUST",role:"Impulsion d’accélération",
 description:"Impact bref déclenché au début d’une accélération",color:"#ff9d58",timing:"immediate",virtual:true
};
const DEFAULT_SWIRL_SEND_WEIGHTS={tops:.72,harmony:.54,piano:.50,lead:.34};

const BUS_OUTPUT_GAIN={rhythm:1.12,tops:1.18,bass:1.12,harmony:1.10,piano:1.00,lead:1.16,fx:1.12};
const FIXED_MIX={rhythm:.70,tops:.48,bass:.64,harmony:.56,piano:0,lead:.46,fx:.22};

let library=null;
const manifestCache=new Map();
let manifest=null;
let currentTrackId="";
let currentTrack=null;
let pendingTrackSwitch=null;
let trackStartedAt=0;
let preparedEndTrack=null;
let endTrackPreparation=null;
let endTrackPreparationFrom="";
let endTrackPreparationToken=0;
let running=false;
let audioCtx=null;
let masterGain=null;
let masterFilter=null;
let masterCompressor=null;
let swirlInput=null;
let swirlReturnGain=null;
let swirlPanner=null;
let swirlDelay=null;
let swirlFeedback=null;
let swirlStemGain=null;
let thrustBassFilter=null;
let thrustAirFilter=null;
let thrustBassGain=null;
let thrustAirGain=null;
const swirlSendNodes=new Map();
let schedulerTimer=null;
let updateTimer=null;
let watchId=null;
let demoTimer=null;
let journeyTimer=null;
let desktopSimActive=localStorage.getItem("drivepulse-desktop-sim")!=="0";
let desktopSimLastUpdate=performance.now();
let desktopState={speed:0,accel:0,brake:0,turn:0};
const desktopKeys={accel:false,brake:false,left:false,right:false};
let generation=0;
let fixedMixMode=false;

let roadMode=localStorage.getItem("drivepulse-road-mode")||"city";
let speedKmh=0;
let gpsSpeedMs=0;
let gpsAcceleration=0;
let gpsHeadingRate=0;
let rawGpsAcceleration=0;
let lastGpsUpdateAt=0;
let smoothed={accel:0,brake:0,turn:0};
let fastImuAccel=0;
let slowGpsAccel=0;
let accelerationTarget=0;
let fastImuBrake=0;
let slowGpsBrake=0;
let imuLongitudinalBias=0;
let imuLongitudinalCorrected=0;
let imuLongitudinalFast=0;
let lastMotionAt=performance.now();
let turnImuEvidence=0;
let turnGyroEvidence=0;
let turnGpsEvidence=0;
let turnConfidence=0;
let rawMotion=vec();
let linearMotion=vec();
let imuLongitudinal=0;
let imuLateral=0;
let verticalYawRate=0;
let motionFrequency=0;
let motionEventCount=0;
let motionFrequencyWindow=performance.now();
let automaticSignScore=0;

let sensorCalibration={
 gravity:vec(0,1,0),
 forward:vec(0,0,-1),
 lateral:vec(1,0,0),
 calibrated:false,
 source:"Orientation par défaut"
};
let calibration={phase:"idle",stationary:[],drive:[],driveWeights:[],timer:null};

let shortMemory=0;
let longMemory=0;
let stableSpeedMemory=0;
let swirlEnvelope=0;
let swirlHoldUntil=0;
let thrustEnvelope=0;
let thrustHoldUntil=0;
let thrustCooldownUntil=0;
let thrustTriggerLevel=0;
let thrustJerk=0;
let previousAccelForThrust=0;
let signedTurn=0;
let gpsHeadingRateSigned=0;
let previousSpeed=0;
let lastMemoryUpdate=performance.now();
let energy=0;
let speedIntensity=0;
let currentScene="intro";
let targetScene="intro";
let currentPhaseStart=0;
let nextLoopTime=0;
let activeGroup=null;
let pendingTransition=null;
let nextLoopGroup=null;
let candidateScene="intro";
let candidateSince=0;
let lastFinaleChoice=false;

const sceneCache=new Map();
const sceneLoads=new Map();
const sceneAccess=new Map();
const busNodes=new Map();
const busRequestedLevels=new Map();
const lastVisualLevels=new Map();
const visualTimeouts=new Map();
const activeGroups=new Set();

let sensorLogging=false;
let sensorLog=[];
let lastLogAt=0;
let lastGps={timestamp:0,speed:null,heading:null};

function setStatus(text){ui.status.innerHTML=`<i></i> ${text}`;}

function currentCharacters(){
 if(!library?.tracks?.length||!manifest)return [];
 const characters=manifest?.characters?.length?[...manifest.characters]:[...BUSES];
 if(!characters.some(item=>item.id===SWIRL_CHARACTER.id))characters.push(SWIRL_CHARACTER);
 if(!characters.some(item=>item.id===THRUST_CHARACTER.id))characters.push(THRUST_CHARACTER);
 return characters;
}

function currentBusSpec(busId){
 return currentCharacters().find(item=>item.id===busId)||BUSES.find(item=>item.id===busId)||{id:busId,timing:"immediate"};
}

function renderAgents(){
 visualTimeouts.forEach(timeout=>clearTimeout(timeout));
 visualTimeouts.clear();lastVisualLevels.clear();
 const characters=currentCharacters();
 if(!characters.length){
  ui.agentGrid.innerHTML=`<div class="empty-library-card"><strong>Orchestre vide</strong><span>Les personnages apparaîtront après l’intégration des stems d’un nouveau morceau.</span></div>`;
  return;
 }
 ui.agentGrid.innerHTML=characters.map((bus,index)=>`
  <article class="agent-card" data-agent="${bus.id}" style="--agent-color:${bus.color||'#38a4ff'}">
   <div class="agent-head">
    <div class="agent-avatar">${bus.emoji||'🎵'}</div>
    <div class="agent-copy"><span class="agent-name">${bus.name||bus.id.toUpperCase()}</span><span class="agent-role">${bus.role||'Stem musical'}</span></div>
   </div>
   <p class="agent-description">${bus.description||'Couche adaptative du morceau'}</p>
   <div class="agent-status"><i></i><span>Inactif</span></div>
   <div class="agent-meter" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="animation-delay:-${((i*.09)+(index*.03)).toFixed(2)}s"></i>`).join("")}</div>
  </article>`).join("");
}

function setAgentVisualState(id,state){
 const card=ui.agentGrid.querySelector(`[data-agent="${id}"]`);
 if(!card)return;
 card.classList.toggle("active",state==="active");
 card.classList.toggle("transition",state==="transition");
 const label=card.querySelector(".agent-status span");
 if(label)label.textContent=state==="active"?"Actif":state==="transition"?"En transition":"Inactif";
}

function updateAgentVisual(id,level){
 const previous=lastVisualLevels.get(id)||0;
 const wasActive=previous>.055;
 const isActive=level>.055;
 lastVisualLevels.set(id,level);
 if(wasActive!==isActive){
  setAgentVisualState(id,"transition");
  if(visualTimeouts.has(id))clearTimeout(visualTimeouts.get(id));
  visualTimeouts.set(id,setTimeout(()=>setAgentVisualState(id,isActive?"active":"inactive"),220));
 }else setAgentVisualState(id,isActive?"active":"inactive");
}

async function loadLibrary(){
 if(library)return library;
 const response=await fetch(LIBRARY_URL,{cache:"no-cache"});
 if(!response.ok)throw new Error("Bibliothèque musicale V9.8 introuvable.");
 library=await response.json();
 library.tracks=Array.isArray(library.tracks)?library.tracks:[];
 localStorage.removeItem("drivepulse-auto-track");
 localStorage.removeItem("drivepulse-auto-track-minutes");
 if(library.tracks.length){
  const savedTrackId=localStorage.getItem("drivepulse-track-id")||"";
  currentTrackId=library.tracks.some(track=>track.id===savedTrackId)
   ?savedTrackId
   :(library.default_track||library.tracks[0].id);
 }else{
  currentTrackId="";
  currentTrack=null;
  manifest=null;
  localStorage.removeItem("drivepulse-track-id");
 }
 renderTrackLibrary();
 return library;
}

function trackById(trackId){
 return library?.tracks?.find(track=>track.id===trackId)||null;
}

function activeProfile(trackId=currentTrackId){
 const track=trackById(trackId);
 return ARRANGEMENT_PROFILES[track?.profile]||ARRANGEMENT_PROFILES.drive;
}

function physicalSceneName(logicalScene,trackId=currentTrackId){
 return activeProfile(trackId).sceneMap[logicalScene]||logicalScene;
}

function sceneKey(trackId,scene){
 return `${trackId}:${scene}`;
}

function isContinuousTrack(trackManifest=manifest){
 return trackManifest?.playback_mode==="continuous";
}

function audioDataKey(trackId,scene="intro"){
 const track=trackById(trackId);
 const trackManifest=manifestCache.get(track?.manifest)||((trackId===currentTrackId)?manifest:null);
 return sceneKey(trackId,isContinuousTrack(trackManifest)?"continuous":scene);
}

async function loadTrackManifest(trackId=currentTrackId){
 const track=trackById(trackId);
 if(!track)throw new Error("Morceau inconnu.");
 if(manifestCache.has(track.manifest))return manifestCache.get(track.manifest);
 const response=await fetch(track.manifest,{cache:"no-cache"});
 if(!response.ok)throw new Error(`Manifest introuvable : ${track.title}`);
 const data=await response.json();
 manifestCache.set(track.manifest,data);
 return data;
}

function applyTrackTiming(trackManifest){
 BPM=finite(trackManifest.bpm)||120;
 BEAT_DURATION=60/BPM;
 BAR_DURATION=finite(trackManifest.bar_duration)||BEAT_DURATION*4;
 TRACK_DURATION=finite(trackManifest.track_duration)||finite(trackManifest.loop_duration)||BAR_DURATION*8;
 LOOP_DURATION=trackManifest.playback_mode==="continuous"?TRACK_DURATION:(finite(trackManifest.loop_duration)||BAR_DURATION*8);
 TRACK_CROSSFADE=clamp(finite(trackManifest.crossfade_duration)||.75,.15,2.5);
}

async function activateTrackMetadata(trackId){
 const track=trackById(trackId);
 if(!track)throw new Error("Morceau inconnu.");
 const trackManifest=await loadTrackManifest(trackId);
 currentTrackId=trackId;
 currentTrack=track;
 manifest=trackManifest;
 applyTrackTiming(trackManifest);
 localStorage.setItem("drivepulse-track-id",trackId);
 renderAgents();
 updateTrackUi();
 updateSwirlSendProfile();
 return trackManifest;
}

function renderTrackLibrary(){
 if(!ui.trackSelect||!library)return;
 const hasTracks=library.tracks.length>0;
 ui.trackSelect.innerHTML=hasTracks
  ?library.tracks.map(track=>`<option value="${track.id}">${track.title} — ${track.edition}</option>`).join("")
  :`<option value="">Aucun morceau installé</option>`;
 ui.trackSelect.value=hasTracks?currentTrackId:"";
 ui.trackSelect.disabled=!hasTracks;
 ui.previousTrack.disabled=!hasTracks;
 ui.nextTrack.disabled=!hasTracks;
 ui.start.disabled=!hasTracks;
 if(!hasTracks){
  ui.trackTitle.textContent="Aucun morceau installé";
  ui.trackEdition.textContent="Bibliothèque prête pour de nouveaux tests";
  ui.trackArtist.textContent="En attente de nouveaux stems";
  ui.trackSwitchState.textContent="Vide";
  ui.chord.textContent="Aucune source";
  ui.musicAttribution.textContent="Aucun morceau audio n’est actuellement intégré au prototype.";
  renderAgents();
  return;
 }
 updateTrackUi();
}

function updateTrackUi(){
 const track=trackById(currentTrackId);
 if(!track){
  ui.trackTitle.textContent="Aucun morceau installé";
  ui.trackEdition.textContent="Bibliothèque prête pour de nouveaux tests";
  ui.trackArtist.textContent="En attente de nouveaux stems";
  ui.trackSwitchState.textContent="Vide";
  ui.chord.textContent="Aucune source";
  ui.musicAttribution.textContent="Aucun morceau audio n’est actuellement intégré au prototype.";
  return;
 }
 ui.trackSelect.value=currentTrackId;
 ui.trackTitle.textContent=track.title;
 ui.trackEdition.textContent=track.edition;
 ui.trackArtist.textContent=track.artist;
 if(!ui.trackSwitchState.classList.contains("loading"))ui.trackSwitchState.textContent=running?"Actif":"Prêt";
 ui.chord.textContent=`${track.title} · ${track.edition}`;
 ui.musicAttribution.textContent=`Musique adaptée de « ${track.title} » par ${track.artist} — licence ${track.license}.`;
 document.documentElement.style.setProperty("--track-accent",track.accent||"#38a4ff");
}


function createSwirlImpulse(duration=2.35,decay=3.15){
 const length=Math.max(1,Math.floor(audioCtx.sampleRate*duration));
 const impulse=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
 for(let channel=0;channel<impulse.numberOfChannels;channel++){
  const data=impulse.getChannelData(channel);
  for(let index=0;index<length;index++){
   const progress=index/length;
   const fadeIn=Math.min(1,index/180);
   data[index]=(Math.random()*2-1)*Math.pow(1-progress,decay)*fadeIn;
  }
 }
 return impulse;
}

function currentSwirlConfig(){
 const config=manifest?.turn_layer||{};
 return {
  enabled:config.enabled!==false,
  wetGain:clamp(finite(config.wet_gain)||.46,0,.8),
  stemGain:clamp(finite(config.stem_gain)||.72,0,1),
  attack:clamp(finite(config.attack_seconds)||.18,.05,1.5),
  hold:clamp(finite(config.hold_seconds)||.35,0,3),
  release:clamp(finite(config.release_seconds)||1.55,.4,8),
  sendWeights:{...DEFAULT_SWIRL_SEND_WEIGHTS,...(config.send_weights||{})}
 };
}

function updateSwirlSendProfile(){
 const weights=currentSwirlConfig().sendWeights;
 swirlSendNodes.forEach((node,busId)=>{
  if(!audioCtx)return;
  node.gain.setTargetAtTime(clamp(finite(weights[busId]),0,1),audioCtx.currentTime,.04);
 });
}

function createAudioGraph(){
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)throw new Error("Web Audio API indisponible.");
 try{audioCtx=new AudioContextClass({latencyHint:"interactive",sampleRate:44100});}
 catch{audioCtx=new AudioContextClass();}

 masterGain=audioCtx.createGain();
 masterFilter=audioCtx.createBiquadFilter();
 masterCompressor=audioCtx.createDynamicsCompressor();
 masterGain.gain.value=.92;
 masterFilter.type="lowpass";
 masterFilter.frequency.value=19000;
 masterFilter.Q.value=.55;
 masterCompressor.threshold.value=-7;
 masterCompressor.knee.value=5;
 masterCompressor.ratio.value=5;
 masterCompressor.attack.value=.004;
 masterCompressor.release.value=.14;
 masterGain.connect(masterFilter).connect(masterCompressor).connect(audioCtx.destination);

 // SWIRL est un bus auxiliaire : le mix sec reste intact et seules les couches
 // mélodiques sont envoyées dans la reverb/delay pendant les virages.
 swirlInput=audioCtx.createGain();
 const swirlHighPass=audioCtx.createBiquadFilter();
 swirlHighPass.type="highpass";
 swirlHighPass.frequency.value=300;
 swirlHighPass.Q.value=.55;

 swirlDelay=audioCtx.createDelay(1);
 swirlDelay.delayTime.value=.175;
 swirlFeedback=audioCtx.createGain();
 swirlFeedback.gain.value=.22;
 const delayReturn=audioCtx.createGain();
 delayReturn.gain.value=.48;

 const convolver=audioCtx.createConvolver();
 convolver.buffer=createSwirlImpulse();
 const reverbReturn=audioCtx.createGain();
 reverbReturn.gain.value=.68;
 const wetMix=audioCtx.createGain();
 swirlPanner=audioCtx.createStereoPanner?audioCtx.createStereoPanner():audioCtx.createGain();
 swirlReturnGain=audioCtx.createGain();
 swirlReturnGain.gain.value=0;
 swirlStemGain=audioCtx.createGain();
 swirlStemGain.gain.value=0;

 swirlInput.connect(swirlHighPass);
 swirlHighPass.connect(swirlDelay);
 swirlDelay.connect(swirlFeedback).connect(swirlDelay);
 swirlDelay.connect(delayReturn).connect(wetMix);
 swirlHighPass.connect(convolver).connect(reverbReturn).connect(wetMix);
 wetMix.connect(swirlPanner).connect(swirlReturnGain).connect(masterGain);
 // Un futur stem spécial de virage est audible directement et alimente aussi l’espace SWIRL.
 swirlStemGain.connect(masterGain);
 swirlStemGain.connect(swirlInput);

 // THRUST est un double bus auxiliaire très court : un renfort grave depuis BOUNCE
 // et une ouverture brillante depuis les couches mélodiques. Aucun nouveau fichier audio n’est requis.
 thrustBassFilter=audioCtx.createBiquadFilter();
 thrustBassFilter.type="lowpass";
 thrustBassFilter.frequency.value=240;
 thrustBassFilter.Q.value=.72;
 thrustBassGain=audioCtx.createGain();
 thrustBassGain.gain.value=0;
 thrustBassFilter.connect(thrustBassGain).connect(masterGain);

 thrustAirFilter=audioCtx.createBiquadFilter();
 thrustAirFilter.type="highpass";
 thrustAirFilter.frequency.value=1050;
 thrustAirFilter.Q.value=.48;
 thrustAirGain=audioCtx.createGain();
 thrustAirGain.gain.value=0;
 thrustAirFilter.connect(thrustAirGain).connect(masterGain);

 BUSES.forEach(bus=>{
  const gain=audioCtx.createGain();
  gain.gain.value=0;
  gain.connect(masterGain);
  busNodes.set(bus.id,gain);
  busRequestedLevels.set(bus.id,0);
  lastVisualLevels.set(bus.id,0);
  if(Object.hasOwn(DEFAULT_SWIRL_SEND_WEIGHTS,bus.id)){
   const send=audioCtx.createGain();
   send.gain.value=DEFAULT_SWIRL_SEND_WEIGHTS[bus.id];
   gain.connect(send).connect(swirlInput);
   swirlSendNodes.set(bus.id,send);
  }
  if(bus.id==="bass")gain.connect(thrustBassFilter);
  if(["tops","harmony","piano","lead"].includes(bus.id))gain.connect(thrustAirFilter);
 });
 updateSwirlSendProfile();
}

async function decodeAudio(url){
 const response=await fetch(url,{cache:"force-cache"});
 if(!response.ok)throw new Error(`Audio introuvable : ${url}`);
 const arrayBuffer=await response.arrayBuffer();
 return audioCtx.decodeAudioData(arrayBuffer);
}

function estimateBufferDb(buffer){
 let sum=0,count=0;
 const stride=512;
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
  const data=buffer.getChannelData(channel);
  for(let index=0;index<data.length;index+=stride){sum+=data[index]*data[index];count++;}
 }
 if(!count)return -120;
 const rms=Math.sqrt(sum/count);
 return rms>1e-7?20*Math.log10(rms):-120;
}

async function loadScene(name,trackId=currentTrackId){
 const trackManifest=await loadTrackManifest(trackId);
 const key=audioDataKey(trackId,name);
 if(sceneCache.has(key)){
  sceneAccess.set(key,performance.now());
  return sceneCache.get(key);
 }
 if(sceneLoads.has(key))return sceneLoads.get(key);
 const promise=(async()=>{
  let files;
  if(isContinuousTrack(trackManifest)){
   files=trackManifest.continuous?.files;
   if(!files)throw new Error("Fichiers continus introuvables.");
  }else{
   const physicalName=physicalSceneName(name,trackId);
   const scene=trackManifest.scenes[physicalName];
   if(!scene)throw new Error(`Scène inconnue : ${name}`);
   files=scene.files;
  }
  const data=new Map();
  await Promise.all(BUSES.map(async bus=>{
   const url=files?.[bus.id];
   if(!url)return;
   const buffer=await decodeAudio(url);
   data.set(bus.id,{buffer,rmsDb:estimateBufferDb(buffer),url});
  }));
  const swirlUrl=files?.swirl||files?.turn_stem||trackManifest?.turn_layer?.stem_file;
  if(swirlUrl){
   const buffer=await decodeAudio(swirlUrl);
   data.set("__swirl",{buffer,rmsDb:estimateBufferDb(buffer),url:swirlUrl});
  }
  sceneCache.set(key,data);
  sceneAccess.set(key,performance.now());
  sceneLoads.delete(key);
  pruneSceneCache();
  return data;
 })().catch(error=>{sceneLoads.delete(key);throw error;});
 sceneLoads.set(key,promise);
 return promise;
}
function pruneSceneCache(){
 const protectedScenes=new Set([
  audioDataKey(currentTrackId,currentScene),
  audioDataKey(currentTrackId,targetScene),
  pendingTransition?audioDataKey(pendingTransition.trackId||currentTrackId,pendingTransition.scene):null,
  nextLoopGroup?audioDataKey(nextLoopGroup.trackId||currentTrackId,nextLoopGroup.scene):null,
  pendingTrackSwitch?audioDataKey(pendingTrackSwitch.trackId,"intro"):null,
  preparedEndTrack?audioDataKey(preparedEndTrack.trackId,"intro"):null
 ].filter(Boolean));
 const candidates=[...sceneCache.keys()].filter(key=>!protectedScenes.has(key));
 while(sceneCache.size>6&&candidates.length){
  candidates.sort((a,b)=>(sceneAccess.get(a)||0)-(sceneAccess.get(b)||0));
  const oldest=candidates.shift();
  sceneCache.delete(oldest);
  sceneAccess.delete(oldest);
 }
}
async function prefetchAllAudio(trackId=currentTrackId){
 const trackManifest=await loadTrackManifest(trackId);
 const urls=[];
 if(isContinuousTrack(trackManifest)){
  Object.values(trackManifest.continuous?.files||{}).forEach(url=>urls.push(url));
 }else{
  Object.values(trackManifest.scenes||{}).forEach(scene=>Object.values(scene.files||{}).forEach(url=>urls.push(url)));
 }
 for(const url of [...new Set(urls)]){
  if(!running)return;
  try{await fetch(url,{cache:"force-cache"});}catch{}
 }
}
function sceneSignal(scene,bus,trackId=currentTrackId){
 const db=sceneCache.get(audioDataKey(trackId,scene))?.get(bus)?.rmsDb??-120;
 return db>-68?1:0;
}

function startSceneGroup(scene,when,offset=0,fadeIn=.055,trackId=currentTrackId){
 const data=sceneCache.get(audioDataKey(trackId,scene));
 if(!data)return null;
 const track=trackById(trackId);
 const trackManifest=manifestCache.get(track?.manifest)||manifest;
 const sourceDuration=isContinuousTrack(trackManifest)
  ?(finite(trackManifest?.track_duration)||TRACK_DURATION)
  :(finite(trackManifest?.loop_duration)||LOOP_DURATION);
 const duration=Math.max(.05,sourceDuration-offset);
 const group={scene,trackId,when,offset,end:when+duration,sources:[],sourceGains:[],stopped:false};
 BUSES.forEach(bus=>{
  const entry=data.get(bus.id);
  if(!entry)return;
  const source=audioCtx.createBufferSource();
  const sourceGain=audioCtx.createGain();
  source.buffer=entry.buffer;
  if(fadeIn>0){
   sourceGain.gain.setValueAtTime(0,when);
   sourceGain.gain.linearRampToValueAtTime(1,when+fadeIn);
  }else sourceGain.gain.setValueAtTime(1,when);
  source.connect(sourceGain).connect(busNodes.get(bus.id));
  const available=Math.max(.03,Math.min(duration,entry.buffer.duration-offset));
  source.start(when,offset,available);
  source.stop(when+available+.04);
  group.sources.push(source);
  group.sourceGains.push(sourceGain);
 });
 const swirlEntry=data.get("__swirl");
 if(swirlEntry&&swirlStemGain){
  const source=audioCtx.createBufferSource();
  const sourceGain=audioCtx.createGain();
  source.buffer=swirlEntry.buffer;
  if(fadeIn>0){
   sourceGain.gain.setValueAtTime(0,when);
   sourceGain.gain.linearRampToValueAtTime(1,when+fadeIn);
  }else sourceGain.gain.setValueAtTime(1,when);
  source.connect(sourceGain).connect(swirlStemGain);
  const available=Math.max(.03,Math.min(duration,swirlEntry.buffer.duration-offset));
  source.start(when,offset,available);
  source.stop(when+available+.04);
  group.sources.push(source);
  group.sourceGains.push(sourceGain);
 }
 activeGroups.add(group);
 const cleanupDelay=Math.max(0,(group.end-audioCtx.currentTime+.2)*1000);
 setTimeout(()=>activeGroups.delete(group),cleanupDelay);
 return group;
}

function fadeOutGroup(group,when,duration=.055){
 if(!group||group.stopped)return;
 group.sourceGains.forEach(gain=>{
  gain.gain.cancelScheduledValues(when);
  gain.gain.setValueAtTime(gain.gain.value,when);
  gain.gain.linearRampToValueAtTime(0,when+duration);
 });
 group.sources.forEach(source=>{try{source.stop(when+duration+.025);}catch{}});
 group.stopped=true;
}

function cancelFutureGroup(group){
 if(!group)return;
 group.sources.forEach(source=>{try{source.stop();}catch{}});
 group.sourceGains.forEach(node=>{try{node.disconnect();}catch{}});
 group.stopped=true;
 activeGroups.delete(group);
}

function nextGridTime(step,minimumTime=audioCtx.currentTime+.06){
 const elapsed=minimumTime-currentPhaseStart;
 return currentPhaseStart+Math.ceil(elapsed/step)*step;
}

function nextTrackId(direction=1,fromTrackId=currentTrackId){
 if(!library?.tracks?.length)return fromTrackId;
 const foundIndex=library.tracks.findIndex(track=>track.id===fromTrackId);
 const index=foundIndex>=0?foundIndex:0;
 return library.tracks[(index+direction+library.tracks.length)%library.tracks.length].id;
}

function clearPreparedEndTrack(){
 endTrackPreparationToken++;
 preparedEndTrack=null;
 endTrackPreparation=null;
 endTrackPreparationFrom="";
}

async function prepareNextTrackForEnd(fromTrackId=currentTrackId){
 if(!running||!library?.tracks?.length||library.tracks.length<2)return null;
 if(preparedEndTrack?.fromTrackId===fromTrackId)return preparedEndTrack;
 if(endTrackPreparation&&endTrackPreparationFrom===fromTrackId)return endTrackPreparation;

 const trackId=nextTrackId(1,fromTrackId);
 const track=trackById(trackId);
 if(!track||trackId===fromTrackId)return null;
 const token=++endTrackPreparationToken;
 endTrackPreparationFrom=fromTrackId;
 endTrackPreparation=(async()=>{
  try{
   const nextManifest=await loadTrackManifest(trackId);
   await loadScene("intro",trackId);
   if(!running||token!==endTrackPreparationToken||currentTrackId!==fromTrackId)return null;
   preparedEndTrack={fromTrackId,trackId,track,manifest:nextManifest};
   return preparedEndTrack;
  }catch(error){
   if(token===endTrackPreparationToken)console.warn("Préchargement du morceau suivant impossible.",error);
   return null;
  }finally{
   if(token===endTrackPreparationToken){
    endTrackPreparation=null;
    endTrackPreparationFrom="";
   }
  }
 })();
 return endTrackPreparation;
}

function commitTrackChange(item){
 currentTrackId=item.trackId;
 currentTrack=item.track;
 manifest=item.manifest;
 applyTrackTiming(manifest);
 localStorage.setItem("drivepulse-track-id",currentTrackId);
 renderAgents();
 updateSwirlSendProfile();

 currentScene="intro";
 targetScene="intro";
 candidateScene="intro";
 candidateSince=performance.now();
 activeGroup=item.group;
 currentPhaseStart=item.when;
 nextLoopTime=item.when+(isContinuousTrack(manifest)?Math.max(1,TRACK_DURATION-TRACK_CROSSFADE):LOOP_DURATION);
 pendingTrackSwitch=null;
 trackStartedAt=performance.now();
 clearPreparedEndTrack();

 updateTrackUi();
 updateSectionTimeline();
 applyBusMix(true);
 warmLikelyScenes();
 prefetchAllAudio(currentTrackId);
 prepareNextTrackForEnd(currentTrackId);
 ui.trackSwitchState.textContent="Actif";
 ui.trackSwitchState.classList.remove("loading");
 setStatus(`${currentTrack.title} — ${currentTrack.edition} actif.`);
}

async function requestTrackSwitch(trackId,reason="manual"){
 if(!library||trackId===currentTrackId||pendingTrackSwitch)return;
 const nextTrack=trackById(trackId);
 if(!nextTrack)return;

 if(!running){
  await activateTrackMetadata(trackId);
  setStatus(`Sélection : ${nextTrack.title} — ${nextTrack.edition}.`);
  return;
 }

 clearPreparedEndTrack();
 ui.trackSwitchState.textContent="Chargement";
 ui.trackSwitchState.classList.add("loading");
 setStatus(`Préparation de ${nextTrack.title} — ${nextTrack.edition}…`);

 try{
  const nextManifest=await loadTrackManifest(trackId);
  await Promise.all([loadScene("intro",trackId),loadScene("groove",trackId)]);

  const now=audioCtx.currentTime;
  const boundary=nextGridTime(BAR_DURATION,now+.18);
  const group=startSceneGroup("intro",boundary,0,1.1,trackId);
  if(!group)throw new Error("Impossible de préparer le nouveau morceau.");

  if(pendingTransition){
   if(pendingTransition.when>now+.03)cancelFutureGroup(pendingTransition.group);
   pendingTransition=null;
  }
  if(nextLoopGroup){
   if(nextLoopGroup.when>now+.03)cancelFutureGroup(nextLoopGroup.group);
   nextLoopGroup=null;
  }

  fadeOutGroup(activeGroup,boundary,1.1);
  pendingTrackSwitch={trackId,track:nextTrack,manifest:nextManifest,when:boundary,group,reason};

  window.setTimeout(()=>{
   if(!running||pendingTrackSwitch?.group!==group)return;
   commitTrackChange(pendingTrackSwitch);
  },Math.max(0,(boundary-audioCtx.currentTime)*1000));
 }catch(error){
  pendingTrackSwitch=null;
  ui.trackSwitchState.textContent="Erreur";
  ui.trackSwitchState.classList.remove("loading");
  prepareNextTrackForEnd(currentTrackId);
  setStatus(error.message||"Changement de morceau impossible.");
 }
}

function commitSceneAt(scene,group,phaseStart){
 currentScene=scene;
 activeGroup=group;
 currentPhaseStart=phaseStart;
 updateSectionTimeline();
 pruneSceneCache();
 warmLikelyScenes();
}

function scheduleTransitionIfReady(){
 if(!running||pendingTrackSwitch||fixedMixMode&&targetScene!=="chorus")return;
 if(targetScene===currentScene||pendingTransition)return;
 const now=audioCtx.currentTime;
 const boundary=nextGridTime(BAR_DURATION,now+.12);

 if(isContinuousTrack()){
  const transitionScene=targetScene;
  const token={scene:transitionScene,trackId:currentTrackId,when:boundary,labelOnly:true};
  pendingTransition=token;
  setTimeout(()=>{
   if(!running||pendingTransition!==token)return;
   currentScene=transitionScene;
   pendingTransition=null;
   updateSectionTimeline();
   applyBusMix(true);
  },Math.max(0,(boundary-audioCtx.currentTime)*1000));
  return;
 }

 if(!sceneCache.has(audioDataKey(currentTrackId,targetScene)))return;
 if(boundary>=nextLoopTime-.045){
  if(nextLoopGroup&&nextLoopGroup.scene!==targetScene&&now<nextLoopGroup.when-.035){
   cancelFutureGroup(nextLoopGroup.group);
   nextLoopGroup=null;
  }
  return;
 }

 const offset=mod(boundary-currentPhaseStart,LOOP_DURATION);
 const transitionScene=targetScene;
 const group=startSceneGroup(transitionScene,boundary,offset,.065);
 if(!group)return;
 fadeOutGroup(activeGroup,boundary,.065);
 pendingTransition={scene:transitionScene,trackId:currentTrackId,when:boundary,offset,group};
 setTimeout(()=>{
  if(!running||pendingTransition?.group!==group)return;
  commitSceneAt(transitionScene,group,boundary-offset);
  pendingTransition=null;
  applyBusMix(true);
 },Math.max(0,(boundary-audioCtx.currentTime)*1000));
}
function scheduler(){
 if(!running||!audioCtx)return;
 const now=audioCtx.currentTime;
 if(pendingTrackSwitch)return;
 scheduleTransitionIfReady();

 if(isContinuousTrack()){
  if(nextLoopGroup&&now>=nextLoopGroup.when-.012){
   const item=nextLoopGroup;
   nextLoopGroup=null;
   if(item.trackSwitch)commitTrackChange(item);
   else{
    activeGroup=item.group;
    currentPhaseStart=item.when;
    nextLoopTime=item.when+Math.max(1,TRACK_DURATION-TRACK_CROSSFADE);
    applyBusMix(true);
    prepareNextTrackForEnd(currentTrackId);
   }
  }
  if(!nextLoopGroup&&nextLoopTime<now+SCHEDULE_AHEAD){
   const prepared=preparedEndTrack?.fromTrackId===currentTrackId?preparedEndTrack:null;
   if(prepared){
    const group=startSceneGroup("intro",nextLoopTime,0,TRACK_CROSSFADE,prepared.trackId);
    if(group){
     fadeOutGroup(activeGroup,nextLoopTime,TRACK_CROSSFADE);
     nextLoopGroup={...prepared,scene:"intro",when:nextLoopTime,group,trackSwitch:true};
     ui.trackSwitchState.textContent="Suivant";
    }
   }else{
    prepareNextTrackForEnd(currentTrackId);
    // Sécurité : si le morceau suivant n’est pas prêt à la toute dernière seconde,
    // le titre courant redémarre sans silence. Le changement aura lieu à sa fin suivante.
    if(nextLoopTime<=now+.16){
     const group=startSceneGroup(currentScene,nextLoopTime,0,TRACK_CROSSFADE);
     if(group){
      fadeOutGroup(activeGroup,nextLoopTime,TRACK_CROSSFADE);
      nextLoopGroup={scene:currentScene,trackId:currentTrackId,when:nextLoopTime,group,trackSwitch:false};
     }
    }
   }
  }
  return;
 }

 if(nextLoopGroup&&now>=nextLoopGroup.when-.012){
  const item=nextLoopGroup;
  nextLoopGroup=null;
  commitSceneAt(item.scene,item.group,item.when);
  nextLoopTime=item.when+LOOP_DURATION;
  applyBusMix(true);
 }

 if(!nextLoopGroup&&nextLoopTime<now+SCHEDULE_AHEAD){
  let scene=currentScene;
  if(sceneCache.has(audioDataKey(currentTrackId,targetScene)))scene=targetScene;
  if(pendingTransition)scene=pendingTransition.scene;
  const group=startSceneGroup(scene,nextLoopTime,0,.012);
  if(group)nextLoopGroup={scene,trackId:currentTrackId,when:nextLoopTime,group};
 }
}
function requestTargetScene(name){
 const physicalName=physicalSceneName(name,currentTrackId);
 if(!manifest?.scenes?.[physicalName])return;
 targetScene=name;
 if(isContinuousTrack()){
  scheduleTransitionIfReady();
  return;
 }
 loadScene(name,currentTrackId).then(()=>scheduleTransitionIfReady()).catch(error=>setStatus(error.message||"Chargement audio impossible."));
}

function warmLikelyScenes(){
 if(isContinuousTrack())return;
 const choices={intro:["groove"],groove:["drive","breakdown"],drive:["chorus","breakdown"],breakdown:["groove","drive"],chorus:["finale","breakdown"],finale:["breakdown","groove"]}[currentScene]||[];
 choices.slice(0,2).forEach(name=>loadScene(name).catch(()=>{}));
}

function busBehaviorLevel(behavior){
 const e=energy,accel=smoothed.accel,brake=smoothed.brake,turn=smoothed.turn;
 const lowSpeedEnabled=true;
 const lowSpeedFade=lowSpeedEnabled?1-smoothstep(26,34,speedKmh):0;
 switch(behavior){
  case "pulse_speed":
   // PULSE suit uniquement la vitesse relative au mode routier.
   return clamp(smoothstep(.06,.92,speedIntensity)*.84,0,.84);
  case "spark_accel":
   // SPARK événementiel : utilisé par les morceaux où il ne doit apparaître qu'à l'accélération.
   return clamp(smoothstep(.05,.58,accel)*.74,0,.74);
  case "spark_always_accel":
   // SPARK reste audible en permanence et reçoit un renfort progressif à l'accélération.
   return clamp(.58+smoothstep(.03,.72,accel)*.28,.58,.86);
  case "spark_accel_turn":
   // Compatibilité avec les anciens manifestes.
   return clamp(Math.max(smoothstep(.05,.55,accel)*.74,smoothstep(.05,.55,turn)*.74),0,.74);
  case "bounce_speed_accel":{
   // V9.8 : la vitesse conserve un socle puissant mais plafonné afin de réserver
   // une vraie marge audible à l’accélération continue et à l’impulsion THRUST.
   const base=smoothstep(.10,.94,speedIntensity)*.62;
   const boost=smoothstep(.03,.76,accel)*.20;
   const impact=thrustEnvelope*.28;
   return clamp(base+boost+impact,0,1);
  }
  case "bounce_speed_energy_brake":
   // Compatibilité avec les anciens manifestes.
   return clamp(Math.max(
    smoothstep(.08,.72,speedIntensity)*.76,
    smoothstep(.12,.72,e)*.78,
    smoothstep(.08,.65,brake)*.86
   ),0,.86);
  case "spark_always":return .66;
  case "bounce_accel_turn":return clamp(Math.max(
   smoothstep(.04,.58,accel)*.84,
   smoothstep(.04,.58,turn)*.84
  ),0,.84);
  case "keys_always":return .68;
  case "voice_always":return .64;
  case "rhythm":return clamp(smoothstep(.20,.62,e)*(.78-brake*.70),0,.78);
  case "tops":return clamp(Math.max(smoothstep(.38,.72,e)*.54,accel*.48,turn*.48),0,.60);
  case "bass":return clamp(smoothstep(.26,.62,e)*.70,0,.70);
  case "foundation":return clamp(.60-.10*e,.48,.60);
  case "low_speed":return clamp(.78*lowSpeedFade,0,.78);
  case "lead":return clamp(smoothstep(.56,.82,e)*.56,0,.56);
  case "voice":return clamp(Math.max(smoothstep(.50,.78,e)*.62,currentScene==="breakdown"?.24:0),0,.62);
  case "accent":return clamp(Math.max(smoothstep(.44,.76,e)*.48,accel*.50,turn*.54),0,.58);
  case "groove":return clamp(Math.max(smoothstep(.24,.62,e)*.62,turn*.30),0,.66);
  case "fx":return clamp(.045+accel*.30+brake*.32+(targetScene!==currentScene?.16:0),0,.34);
  default:return 0;
 }
}

function desiredBusLevels(){
 if(fixedMixMode)return {...FIXED_MIX};
 const behaviors=manifest?.bus_behaviors||{rhythm:"rhythm",tops:"tops",bass:"bass",harmony:"foundation",piano:"low_speed",lead:"lead",fx:"fx"};
 const result={};
 BUSES.forEach(bus=>result[bus.id]=busBehaviorLevel(behaviors[bus.id]||"silent"));
 return result;
}

function scheduleBusLevel(bus,level,force=false){
 const node=busNodes.get(bus.id);
 if(!node||!audioCtx)return;
 const previous=busRequestedLevels.get(bus.id)||0;
 if(!force&&Math.abs(level-previous)<.025)return;
 busRequestedLevels.set(bus.id,level);
 const now=audioCtx.currentTime;
 node.gain.cancelScheduledValues(now);
 node.gain.setValueAtTime(node.gain.value,now);
 const timing=currentBusSpec(bus.id).timing||bus.timing||"immediate";
 if(timing==="immediate")node.gain.setTargetAtTime(level,now,.038);
 else{
  const grid=timing==="beat"?BEAT_DURATION:BAR_DURATION;
  const when=nextGridTime(grid,now+.035);
  node.gain.setValueAtTime(node.gain.value,when);
  node.gain.linearRampToValueAtTime(level,when+.055);
 }
}

function applySwirlMix(force=false){
 if(!audioCtx||!swirlReturnGain)return;
 const config=currentSwirlConfig();
 const now=audioCtx.currentTime;
 const level=config.enabled?swirlEnvelope:0;
 const wet=clamp(level*config.wetGain,0,.72);
 swirlReturnGain.gain.cancelScheduledValues(now);
 swirlReturnGain.gain.setTargetAtTime(wet,now,force?.018:.055);
 if(swirlStemGain){
  swirlStemGain.gain.cancelScheduledValues(now);
  swirlStemGain.gain.setTargetAtTime(level*config.stemGain,now,force?.018:.050);
 }
 if(swirlPanner?.pan){
  const pan=clamp(signedTurn*.46,-.46,.46);
  swirlPanner.pan.setTargetAtTime(pan,now,.08);
 }
 if(swirlDelay){
  const delay=.145+level*.075;
  swirlDelay.delayTime.setTargetAtTime(delay,now,.09);
 }
 updateAgentVisual("swirl",level);
}

function applyThrustMix(force=false){
 if(!audioCtx||!thrustBassGain||!thrustAirGain)return;
 const now=audioCtx.currentTime;
 const bassAmount=clamp(thrustEnvelope*.30,0,.30);
 const airAmount=clamp(thrustEnvelope*.13,0,.13);
 thrustBassGain.gain.cancelScheduledValues(now);
 thrustAirGain.gain.cancelScheduledValues(now);
 thrustBassGain.gain.setTargetAtTime(bassAmount,now,force?.012:.030);
 thrustAirGain.gain.setTargetAtTime(airAmount,now,force?.012:.026);
 updateAgentVisual("thrust",thrustEnvelope);
}

function applyBusMix(force=false){
 if(!audioCtx)return;
 const desired=desiredBusLevels();
 const availabilityScene=pendingTransition?.scene||currentScene;
 const profileMultipliers=activeProfile().busMultipliers;
 BUSES.forEach(bus=>{
  const signal=Math.max(
   sceneSignal(currentScene,bus.id,currentTrackId),
   pendingTransition?sceneSignal(pendingTransition.scene,bus.id,pendingTransition.trackId||currentTrackId):0
  );
  let level=desired[bus.id]*(signal?1:0);
  const trackGain=manifest?.bus_output_gain?.[bus.id]??BUS_OUTPUT_GAIN[bus.id]??1;
  level=clamp(level*trackGain*(profileMultipliers[bus.id]||1),0,1);
  scheduleBusLevel(bus,level,force);
  updateAgentVisual(bus.id,level);
 });

 const now=audioCtx.currentTime;
 const brake=smoothed.brake;
 const cutoff=fixedMixMode?19000:brake>.04?900+(1-brake)*6800:10500+energy*8500+smoothed.accel*1800+thrustEnvelope*4200;
 masterFilter.frequency.setTargetAtTime(clamp(cutoff,650,19500),now,.045);
 masterGain.gain.setTargetAtTime(fixedMixMode?.90:brake>.58?.72:.92,now,.055);
 applySwirlMix(force);
 applyThrustMix(force);
}


function formatTurnSignal(value){
 const magnitude=Math.round(Math.abs(value)*100);
 if(magnitude<2)return "Centre";
 return `${value<0?"Gauche":"Droite"} ${magnitude}%`;
}

function readDesktopControls(){
 desktopState.speed=clamp(finite(ui.simSpeed.value),0,180);
 desktopState.accel=clamp(finite(ui.simAccel.value));
 desktopState.brake=clamp(finite(ui.simBrake.value));
 desktopState.turn=clamp(finite(ui.simTurn.value),-1,1);
}

function updateDesktopControlLabels(){
 ui.simSpeedValue.value=`${Math.round(desktopState.speed)} km/h`;
 ui.simAccelValue.value=`${Math.round(desktopState.accel*100)}%`;
 ui.simBrakeValue.value=`${Math.round(desktopState.brake*100)}%`;
 ui.simTurnValue.value=formatTurnSignal(desktopState.turn);
 const actions=[];
 if(desktopState.accel>.05)actions.push(`accélération ${Math.round(desktopState.accel*100)}%`);
 if(desktopState.brake>.05)actions.push(`freinage ${Math.round(desktopState.brake*100)}%`);
 if(Math.abs(desktopState.turn)>.05)actions.push(formatTurnSignal(desktopState.turn).toLowerCase());
 ui.simLiveState.textContent=`${Math.round(desktopState.speed)} km/h · ${actions.length?actions.join(" · "):"conduite stable"}`;
}

function updateDesktopSimulatorUi(){
 ui.desktopSimBtn.classList.toggle("active",desktopSimActive);
 ui.desktopSimBtn.textContent=desktopSimActive?"Simulateur PC actif":"Activer simulateur PC";
 ui.desktopSimState.classList.toggle("active",desktopSimActive);
 ui.desktopSimState.textContent=desktopSimActive?"Mode PC actif":"Capteurs réels";
 ui.desktopSimPanel.classList.toggle("inactive",!desktopSimActive);
 ui.calibrate.disabled=desktopSimActive||!running;
 updateDesktopControlLabels();
}

async function setDesktopSimulation(active,restoreSensors=true){
 desktopSimActive=Boolean(active);
 localStorage.setItem("drivepulse-desktop-sim",desktopSimActive?"1":"0");
 desktopSimLastUpdate=performance.now();
 if(desktopSimActive){
  if(demoTimer){clearInterval(demoTimer);demoTimer=null;if(ui.demo)ui.demo.textContent="Simulation libre";}
  if(journeyTimer){clearInterval(journeyTimer);journeyTimer=null;if(ui.journey)ui.journey.textContent="Scénario trajet complet";}
  if(watchId!=null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);
  watchId=null;
  window.removeEventListener("devicemotion",handleMotion);
  motionFrequency=20;
  if(running)setStatus("Simulateur PC actif : utilise les curseurs ou le clavier.");
 }else if(running&&restoreSensors){
  const motionGranted=await requestMotionPermission();
  if(!desktopSimActive){
   if(motionGranted)window.addEventListener("devicemotion",handleMotion,{passive:true});
   startGps();
  }
  setStatus(motionGranted?"Capteurs réels actifs.":"GPS actif ; capteurs Motion indisponibles.");
 }
 updateDesktopSimulatorUi();
}

function releaseDesktopSignals(){
 desktopState.accel=0;desktopState.brake=0;desktopState.turn=0;
 ui.simAccel.value="0";ui.simBrake.value="0";ui.simTurn.value="0";
 desktopKeys.accel=desktopKeys.brake=desktopKeys.left=desktopKeys.right=false;
 updateDesktopControlLabels();
}

function applyDesktopPreset(name){
 const presets={stop:[0,"city"],city30:[30,"city"],city50:[50,"city"],country80:[80,"country"],highway130:[130,"highway"]};
 const preset=presets[name];
 if(!preset)return;
 desktopState.speed=preset[0];
 ui.simSpeed.value=String(desktopState.speed);
 releaseDesktopSignals();
 applyRoadMode(preset[1]);
 updateDesktopControlLabels();
}

function updateDesktopSimulation(){
 if(!desktopSimActive)return;
 const now=performance.now();
 const dt=Math.max(.01,Math.min(.20,(now-desktopSimLastUpdate)/1000));
 desktopSimLastUpdate=now;
 readDesktopControls();
 const acceleration=Math.max(desktopState.accel,desktopKeys.accel?1:0);
 const braking=Math.max(desktopState.brake,desktopKeys.brake?1:0);
 let steering=desktopState.turn;
 if(desktopKeys.left&&!desktopKeys.right)steering=-1;
 else if(desktopKeys.right&&!desktopKeys.left)steering=1;

 if(ui.simLinkPedals.checked){
  const propulsion=acceleration*26;
  const deceleration=braking*42;
  const rolling=acceleration<.02&&braking<.02&&desktopState.speed>0?.32:0;
  desktopState.speed=clamp(desktopState.speed+(propulsion-deceleration-rolling)*dt,0,180);
  ui.simSpeed.value=String(Math.round(desktopState.speed));
 }
 speedKmh=desktopState.speed;
 gpsSpeedMs=speedKmh/3.6;
 gpsAcceleration=acceleration*2.25-braking*3.4;
 rawGpsAcceleration=gpsAcceleration;
 lastGpsUpdateAt=performance.now();
 fastImuAccel=acceleration;slowGpsAccel=acceleration;accelerationTarget=acceleration;
 fastImuBrake=braking;slowGpsBrake=braking;
 turnImuEvidence=Math.abs(steering);turnGyroEvidence=Math.abs(steering);turnGpsEvidence=Math.abs(steering);turnConfidence=Math.abs(steering);
 gpsHeadingRate=Math.abs(steering)*38;
 imuLongitudinal=gpsAcceleration;
 imuLateral=steering*2.5;
 verticalYawRate=Math.abs(steering)*48;
 rawMotion=vec(steering*1.2,0,gpsAcceleration);
 linearMotion=rawMotion;
 motionFrequency=20;
 smoothed.accel=lowPass(smoothed.accel,acceleration,.42);
 smoothed.brake=lowPass(smoothed.brake,braking,.42);
 smoothed.turn=lowPass(smoothed.turn,Math.abs(steering),.40);
 signedTurn=lowPass(signedTurn,steering,.36);
 desktopState.turn=finite(ui.simTurn.value);
 updateDesktopControlLabels();
}

function updateDrivingMemory(){
 const now=performance.now();
 const dt=Math.min(1,(now-lastMemoryUpdate)/1000);
 lastMemoryUpdate=now;
 const profile=ROAD_PROFILES[roadMode];
 speedRatio=Math.max(0,speedKmh/profile.maxSpeed);
 speedIntensity=clamp(speedRatio);
 const immediate=clamp(speedIntensity*.45+smoothed.accel*.30+smoothed.turn*.13-smoothed.brake*.20);
 shortMemory=lowPass(shortMemory,immediate,Math.min(.48,dt*.62));
 longMemory=lowPass(longMemory,shortMemory,Math.min(.10,dt*.052));
 const speedDelta=Math.abs(speedKmh-previousSpeed);
 const stable=speedKmh>8&&speedDelta<2.4&&smoothed.accel<.18&&smoothed.brake<.18?1:0;
 stableSpeedMemory=lowPass(stableSpeedMemory,stable,Math.min(.25,dt*.15));

 // THRUST détecte le départ de l’accélération, pas seulement son niveau.
 // Le jerk normalisé est la montée de la cible d’accélération par seconde.
 const accelRise=Math.max(0,accelerationTarget-previousAccelForThrust);
 const jerkRate=accelRise/Math.max(.025,dt);
 thrustJerk=followEnvelope(thrustJerk,clamp(jerkRate/3.2),dt,.025,.24);
 const thresholdCross=previousAccelForThrust<.12&&accelerationTarget>=.18
  ?smoothstep(.18,.62,accelerationTarget)
  :0;
 const jerkTrigger=smoothstep(.42,2.55,jerkRate)*smoothstep(.08,.62,accelerationTarget);
 const trigger=Math.max(thresholdCross,jerkTrigger);
 if(trigger>.16&&now>=thrustCooldownUntil){
  thrustTriggerLevel=clamp(Math.max(trigger,.38));
  thrustEnvelope=Math.max(thrustEnvelope,thrustTriggerLevel);
  thrustHoldUntil=now+190;
  thrustCooldownUntil=now+520;
 }
 const thrustTarget=now<thrustHoldUntil?thrustTriggerLevel:0;
 thrustEnvelope=followEnvelope(thrustEnvelope,thrustTarget,dt,.032,.66);
 if(thrustEnvelope<.012&&now>=thrustHoldUntil)thrustTriggerLevel=0;
 previousAccelForThrust=accelerationTarget;

 const swirlConfig=currentSwirlConfig();
 const turnTarget=clamp(smoothstep(.18,.68,smoothed.turn)*(.48+.52*smoothstep(.08,.92,speedIntensity)));
 if(turnTarget>swirlEnvelope+.04)swirlHoldUntil=now+swirlConfig.hold*1000;
 const heldTarget=now<swirlHoldUntil?Math.max(turnTarget,swirlEnvelope*.94):turnTarget;
 const tau=heldTarget>swirlEnvelope?swirlConfig.attack:swirlConfig.release;
 const swirlAmount=1-Math.exp(-dt/Math.max(.01,tau));
 swirlEnvelope=lowPass(swirlEnvelope,heldTarget,swirlAmount);
 if(smoothed.turn<.025&&now>=swirlHoldUntil)signedTurn=lowPass(signedTurn,0,Math.min(.22,dt*.8));
 previousSpeed=speedKmh;
 energy=clamp(speedIntensity*.40+shortMemory*.16+longMemory*.08+smoothed.accel*.20+thrustEnvelope*.08+smoothed.turn*.10-smoothed.brake*.15);
}

function evaluateScene(){
 if(fixedMixMode)return "chorus";
 const profile=ROAD_PROFILES[roadMode];
 if(smoothed.brake>.42)return "breakdown";
 if(speedKmh<4)return "intro";
 if(speedRatio>profile.finaleRatio&&longMemory>.72&&energy>.74)return "finale";
 if(speedRatio>profile.chorusRatio&&longMemory>.56&&energy>.62)return "chorus";
 if(smoothed.accel>.27||shortMemory>.68)return "drive";
 if(speedRatio>profile.grooveRatio||stableSpeedMemory>.42)return "groove";
 return "intro";
}

function maybeUpdateTarget(){
 const candidate=evaluateScene();
 const now=performance.now();
 if(candidate!==candidateScene){candidateScene=candidate;candidateSince=now;return;}
 const responsiveness=Math.max(.5,Number(ui.responsiveness.value));
 const hold=candidate==="breakdown"?70:candidate==="drive"?220/responsiveness:420/responsiveness;
 if(candidate!==targetScene&&now-candidateSince>=hold)requestTargetScene(candidate);
}

function updateSectionTimeline(){
 const nodes=document.querySelectorAll("[data-section]");
 if(!nodes.length)return;
 nodes.forEach(node=>node.classList.toggle("current",node.dataset.section===currentScene));
}

function modeLabel(){
 if(fixedMixMode)return "Mix fixe";
 if(smoothed.brake>.36)return "Brake";
 if(energy>.70)return "Boost";
 if(smoothed.turn>.34)return "Curve";
 if(energy>.34)return "Drive";
 return "Cruise";
}

function updateCalibrationBadge(){
 const phase=calibration.phase;
 ui.calibrationState.classList.toggle("running",phase!=="idle");
 ui.calibrationState.classList.toggle("ready",phase==="idle"&&sensorCalibration.calibrated);
 if(phase==="stationary")ui.calibrationState.textContent="Étape 1/2 : immobile";
 else if(phase==="drive")ui.calibrationState.textContent="Étape 2/2 : ligne droite";
 else ui.calibrationState.textContent=sensorCalibration.calibrated?"Calibration 3D prête":"Orientation par défaut";
}

function updateUi(){
 const profile=ROAD_PROFILES[roadMode];
 const now=audioCtx&&running?audioCtx.currentTime:currentPhaseStart;
 const playbackElapsed=running?Math.max(0,now-currentPhaseStart):0;
 const playbackPosition=isContinuousTrack()
  ?mod(playbackElapsed,Math.max(1,TRACK_DURATION))
  :mod(playbackElapsed,Math.max(1,LOOP_DURATION));
 const playbackTotal=isContinuousTrack()?Math.max(1,TRACK_DURATION):Math.max(1,LOOP_DURATION);
 const levels=desiredBusLevels();
 ui.speed.textContent=Math.round(speedKmh);
 ui.speedMusic.textContent=`${Math.round(speedIntensity*100)}%`;
 ui.speedMusicTrack.style.width=`${Math.round(speedIntensity*100)}%`;
 ui.energy.textContent=`${Math.round(energy*100)}%`;
 ui.energyTrack.style.width=`${Math.round(energy*100)}%`;
 if(ui.section)ui.section.textContent=SCENE_LABELS[currentScene];
 if(ui.mode)ui.mode.textContent=modeLabel();
 ui.bar.textContent=`${formatClock(playbackPosition)} / ${formatClock(playbackTotal)}`;
 ui.road.textContent=profile.label;
 ui.roadHelp.textContent=profile.help;

 ui.accel.value=smoothed.accel;ui.brake.value=smoothed.brake;ui.turn.value=smoothed.turn;ui.music.value=energy;
 ui.accelValue.value=smoothed.accel.toFixed(2);ui.brakeValue.value=smoothed.brake.toFixed(2);ui.turnValue.value=smoothed.turn.toFixed(2);ui.musicValue.value=energy.toFixed(2);
 const displayedTrack=trackById(currentTrackId);ui.chord.textContent=displayedTrack?`${displayedTrack.title} · ${displayedTrack.edition}`:"Bibliothèque";
 ui.bass.textContent=levels.bass>.68?"Forte":levels.bass>.24?"Active":"Repos";
 ui.drum.textContent=levels.rhythm>.66?"Rapide":levels.rhythm>.20?"Progressive":"Lente";
 ui.arp.textContent=levels.lead>.05?"Permanente":"Erreur";
 ui.filter.textContent=smoothed.brake>.18?"Fermé":"Ouvert";
 ui.variation.textContent=SCENE_LABELS[targetScene];
 const defaultActive=manifest?.reaction_rules?.default_active||[];
 ui.idle.textContent=defaultActive.length?`${defaultActive.join(" + ")} actifs`:"Fond adaptatif";
 if(ui.swirl)ui.swirl.textContent=swirlEnvelope>.68?"Large":swirlEnvelope>.12?"Ouvert":"Sec";
 if(ui.thrust)ui.thrust.textContent=thrustEnvelope>.62?"Impact":thrustEnvelope>.10?"Déclenché":"Prêt";

 ui.motionX.textContent=rawMotion.x.toFixed(2);ui.motionY.textContent=rawMotion.y.toFixed(2);ui.motionZ.textContent=rawMotion.z.toFixed(2);
 ui.imuLong.textContent=imuLongitudinal.toFixed(2);ui.imuLat.textContent=imuLateral.toFixed(2);
 ui.gpsAccel.textContent=`${gpsAcceleration.toFixed(2)} m/s²`;ui.yawRate.textContent=`${verticalYawRate.toFixed(1)} °/s`;ui.headingRate.textContent=`${gpsHeadingRate.toFixed(1)} °/s`;
 ui.motionHz.textContent=`${motionFrequency.toFixed(0)} Hz`;ui.audioMode.textContent=fixedMixMode?"Mix fixe":"Adaptatif low latency";
 if(ui.thrustJerk)ui.thrustJerk.textContent=thrustJerk.toFixed(2);
 if(ui.thrustLevel)ui.thrustLevel.textContent=`${Math.round(thrustEnvelope*100)}%`;
 updateCalibrationBadge();
}

function maybeLogSensors(){
 if(!sensorLogging)return;
 const now=performance.now();
 if(now-lastLogAt<200)return;
 lastLogAt=now;
 sensorLog.push({
  iso:new Date().toISOString(),elapsed_ms:Math.round(now),track_id:currentTrackId,input_mode:desktopSimActive?"desktop":"sensors",road_mode:roadMode,scene:currentScene,target_scene:targetScene,
  speed_kmh:speedKmh.toFixed(2),gps_accel_raw_ms2:rawGpsAcceleration.toFixed(3),gps_accel_ms2:gpsAcceleration.toFixed(3),gps_age_ms:Math.round(Math.max(0,performance.now()-lastGpsUpdateAt)),gps_heading_rate_dps:gpsHeadingRate.toFixed(3),
  motion_x:rawMotion.x.toFixed(4),motion_y:rawMotion.y.toFixed(4),motion_z:rawMotion.z.toFixed(4),
  imu_longitudinal:imuLongitudinal.toFixed(4),imu_longitudinal_corrected:imuLongitudinalCorrected.toFixed(4),imu_longitudinal_filtered:imuLongitudinalFast.toFixed(4),imu_lateral:imuLateral.toFixed(4),yaw_rate_dps:verticalYawRate.toFixed(3),
  imu_accel_fast:fastImuAccel.toFixed(4),gps_accel_slow:slowGpsAccel.toFixed(4),accel_target:accelerationTarget.toFixed(4),accel_signal:smoothed.accel.toFixed(4),
  thrust_jerk:thrustJerk.toFixed(4),thrust_trigger:thrustTriggerLevel.toFixed(4),thrust_level:thrustEnvelope.toFixed(4),
  brake_signal:smoothed.brake.toFixed(4),turn_imu_evidence:turnImuEvidence.toFixed(4),turn_gyro_evidence:turnGyroEvidence.toFixed(4),turn_gps_evidence:turnGpsEvidence.toFixed(4),turn_confidence:turnConfidence.toFixed(4),turn_signal:smoothed.turn.toFixed(4),turn_signed:signedTurn.toFixed(4),swirl_level:swirlEnvelope.toFixed(4),pedals_linked:desktopSimActive&&ui.simLinkPedals.checked?1:0,
  energy:energy.toFixed(4),speed_ratio:speedRatio.toFixed(4),
  rhythm_level:(busRequestedLevels.get("rhythm")||0).toFixed(4),tops_level:(busRequestedLevels.get("tops")||0).toFixed(4),
  bass_level:(busRequestedLevels.get("bass")||0).toFixed(4),harmony_level:(busRequestedLevels.get("harmony")||0).toFixed(4),
  piano_level:(busRequestedLevels.get("piano")||0).toFixed(4),lead_level:(busRequestedLevels.get("lead")||0).toFixed(4),fx_level:(busRequestedLevels.get("fx")||0).toFixed(4),
  motion_hz:motionFrequency.toFixed(1),calibrated:sensorCalibration.calibrated?1:0
 });
 if(sensorLog.length>24000)sensorLog.shift();
 ui.downloadLog.disabled=sensorLog.length===0;
}

function updateEngine(){
 if(!running)return;
 updateDesktopSimulation();
 updateDrivingMemory();
 maybeUpdateTarget();
 applyBusMix();
 updateUi();
 maybeLogSensors();
}

async function requestMotionPermission(){
 try{
  if(typeof DeviceMotionEvent==="undefined")return false;
  if(typeof DeviceMotionEvent.requestPermission==="function"){
   const result=await DeviceMotionEvent.requestPermission();
   if(result!=="granted")return false;
  }
  return true;
 }catch{return false;}
}

function loadSavedCalibration(){
 try{
  const saved=JSON.parse(localStorage.getItem("drivepulse-calibration-3d")||"null");
  if(saved?.gravity&&saved?.forward&&saved?.lateral){
   sensorCalibration={gravity:normalize(saved.gravity),forward:normalize(saved.forward),lateral:normalize(saved.lateral),calibrated:true,source:"Calibration enregistrée"};
  }
 }catch{}
}

function saveCalibration(){
 localStorage.setItem("drivepulse-calibration-3d",JSON.stringify(sensorCalibration));
}

function calculateLinearAcceleration(event){
 const acceleration=event.acceleration;
 if(acceleration&&[acceleration.x,acceleration.y,acceleration.z].some(value=>value!==null&&Number.isFinite(Number(value)))){
  return vec(finite(acceleration.x),finite(acceleration.y),finite(acceleration.z));
 }
 const including=event.accelerationIncludingGravity;
 if(!including)return vec();
 return add(vec(finite(including.x),finite(including.y),finite(including.z)),scale(sensorCalibration.gravity,-9.80665));
}

function handleMotion(event){
 if(!running||desktopSimActive||demoTimer||journeyTimer)return;
 motionEventCount++;
 const now=performance.now();
 const dt=clamp((now-lastMotionAt)/1000,.005,.20);
 lastMotionAt=now;
 if(now-motionFrequencyWindow>=1000){
  motionFrequency=motionEventCount*1000/(now-motionFrequencyWindow);
  motionEventCount=0;motionFrequencyWindow=now;
 }

 const including=event.accelerationIncludingGravity;
 const includingVector=including?vec(finite(including.x),finite(including.y),finite(including.z)):vec();
 linearMotion=calculateLinearAcceleration(event);
 rawMotion=linearMotion;

 if(calibration.phase==="stationary"&&including)calibration.stationary.push(includingVector);
 if(calibration.phase==="drive"){
  const magnitude=length(linearMotion);
  if(magnitude>.045){
   calibration.drive.push(linearMotion);
   calibration.driveWeights.push(Math.max(.15,clamp(gpsAcceleration/1.5),clamp(magnitude/2)));
  }
 }

 imuLongitudinal=dot(linearMotion,sensorCalibration.forward);
 imuLateral=dot(linearMotion,sensorCalibration.lateral);
 const rotation=event.rotationRate||{};
 const angular=vec(finite(rotation.beta),finite(rotation.gamma),finite(rotation.alpha));
 const verticalYawSigned=dot(angular,sensorCalibration.gravity);
 verticalYawRate=Math.abs(verticalYawSigned);

 if(gpsAcceleration>.25&&Math.abs(imuLongitudinal)>.05&&sensorCalibration.calibrated){
  automaticSignScore=lowPass(automaticSignScore,Math.sign(gpsAcceleration*imuLongitudinal),.035);
  if(automaticSignScore<-.68){
   sensorCalibration.forward=scale(sensorCalibration.forward,-1);
   sensorCalibration.lateral=scale(sensorCalibration.lateral,-1);
   automaticSignScore=0;
   saveCalibration();
   setStatus("Sens de l’axe avant corrigé automatiquement.");
  }
 }

 // Le biais lent absorbe les petites erreurs d’orientation et les pentes sans retarder les impulsions réelles.
 const quietForBias=Math.abs(gpsAcceleration)<.10&&verticalYawRate<5&&Math.abs(imuLateral)<.45&&Math.abs(imuLongitudinal-imuLongitudinalBias)<.75;
 if(quietForBias){
  const biasAmount=1-Math.exp(-dt/8);
  imuLongitudinalBias=lowPass(imuLongitudinalBias,imuLongitudinal,biasAmount);
 }
 imuLongitudinalCorrected=imuLongitudinal-imuLongitudinalBias;
 // Filtre court (environ 160 ms) : conserve l’attaque d’une accélération, rejette une partie des vibrations de route.
 imuLongitudinalFast=followEnvelope(imuLongitudinalFast,imuLongitudinalCorrected,dt,.055,.16);

 const accelSensitivity=Number(ui.accelSensitivity.value);
 const turnSensitivity=Number(ui.turnSensitivity.value);
 const gpsAge=Math.max(0,now-lastGpsUpdateAt);
 const gpsFreshness=Math.exp(-gpsAge/1700);

 // Accélération : IMU 60 Hz prioritaire pour l’attaque, GPS lent uniquement pour confirmer et maintenir.
 const motionMagnitude=Math.max(.15,length(linearMotion));
 const longitudinalPurity=smoothstep(.35,.82,Math.abs(imuLongitudinalFast)/motionMagnitude);
 const imuAccelTarget=smoothstep(.15,1.90,Math.max(0,imuLongitudinalFast))*(.15+.85*longitudinalPurity);
 const gpsAccelTarget=smoothstep(.04,1.55,Math.max(0,gpsAcceleration)*gpsFreshness);
 fastImuAccel=followEnvelope(fastImuAccel,imuAccelTarget,dt,.040,.18);
 slowGpsAccel=followEnvelope(slowGpsAccel,gpsAccelTarget,dt,.16,.85);
 accelerationTarget=clamp(Math.max(
  fastImuAccel*.90,
  slowGpsAccel*.82,
  fastImuAccel*.58+slowGpsAccel*.30
 )*accelSensitivity);
 smoothed.accel=followEnvelope(smoothed.accel,accelerationTarget,dt,.060,.35);

 // Freinage : même principe, avec une attaque rapide mais légèrement plus filtrée.
 const imuBrakeTarget=smoothstep(.06,1.55,Math.max(0,-imuLongitudinalCorrected));
 const gpsBrakeTarget=smoothstep(.04,1.85,Math.max(0,-gpsAcceleration)*gpsFreshness);
 fastImuBrake=followEnvelope(fastImuBrake,imuBrakeTarget,dt,.055,.34);
 slowGpsBrake=followEnvelope(slowGpsBrake,gpsBrakeTarget,dt,.18,.80);
 const brakeTarget=clamp(Math.max(fastImuBrake*.90,slowGpsBrake*.86,fastImuBrake*.62+slowGpsBrake*.42)*accelSensitivity);
 smoothed.brake=followEnvelope(smoothed.brake,brakeTarget,dt,.075,.56);

 // Virages : le gyroscope ou le changement de cap doivent valider l’accélération latérale.
 const imuTurnTarget=smoothstep(.35,2.40,Math.abs(imuLateral));
 const gyroTurnTarget=smoothstep(5.5,36,verticalYawRate);
 const gpsTurnTarget=smoothstep(3.5,26,gpsHeadingRate*gpsFreshness);
 turnImuEvidence=followEnvelope(turnImuEvidence,imuTurnTarget,dt,.07,.32);
 turnGyroEvidence=followEnvelope(turnGyroEvidence,gyroTurnTarget,dt,.07,.36);
 turnGpsEvidence=followEnvelope(turnGpsEvidence,gpsTurnTarget,dt,.15,.75);
 turnConfidence=clamp(Math.max(
  turnGyroEvidence*.72+Math.max(turnImuEvidence,turnGpsEvidence)*.28,
  turnGpsEvidence*.70+turnImuEvidence*.25,
  Math.min(turnGyroEvidence,turnGpsEvidence)*1.08
 )*turnSensitivity);
 smoothed.turn=followEnvelope(smoothed.turn,turnConfidence,dt,.10,.42);

 const directionSource=turnGyroEvidence>.12?Math.sign(verticalYawSigned):(turnGpsEvidence>.12?Math.sign(gpsHeadingRateSigned):Math.sign(imuLateral));
 signedTurn=followEnvelope(signedTurn,directionSource*smoothed.turn,dt,.10,.48);
}
function beginCalibration(){
 if(calibration.phase!=="idle")return;
 calibration={phase:"stationary",stationary:[],drive:[],driveWeights:[],timer:null};
 ui.calibrate.disabled=true;
 setStatus("Calibration 1/2 : véhicule arrêté, ne touche pas le téléphone pendant 2,5 s.");
 updateCalibrationBadge();
 calibration.timer=setTimeout(()=>{
  if(calibration.phase!=="stationary")return;
  const gravityMean=meanVector(calibration.stationary);
  if(length(gravityMean)<2){
   cancelCalibration("Gravité non détectée. Recommence la calibration.");
   return;
  }
  sensorCalibration.gravity=normalize(gravityMean);
  calibration.phase="drive";
  setStatus("Calibration 2/2 : accélère doucement en ligne droite pendant 6 s.");
  updateCalibrationBadge();
  calibration.timer=setTimeout(finishCalibration,6500);
 },2500);
}

function finishCalibration(){
 if(calibration.phase!=="drive")return;
 let weighted=vec(),totalWeight=0;
 calibration.drive.forEach((sample,index)=>{
  const weight=calibration.driveWeights[index]||.2;
  weighted=add(weighted,scale(sample,weight));totalWeight+=weight;
 });
 let forwardVector=totalWeight?scale(weighted,1/totalWeight):vec();
 forwardVector=projectToPlane(forwardVector,sensorCalibration.gravity);
 if(length(forwardVector)<.055){
  const strongest=[...calibration.drive].sort((a,b)=>length(b)-length(a))[0];
  if(strongest)forwardVector=projectToPlane(strongest,sensorCalibration.gravity);
 }
 if(length(forwardVector)<.04){
  cancelCalibration("Accélération insuffisante. Recommence sur une ligne droite.");
  return;
 }
 sensorCalibration.forward=normalize(forwardVector,sensorCalibration.forward);
 sensorCalibration.lateral=normalize(cross(sensorCalibration.gravity,sensorCalibration.forward),sensorCalibration.lateral);
 sensorCalibration.calibrated=true;
 sensorCalibration.source="Calibration Motion + GPS";
 saveCalibration();
 calibration.phase="idle";
 calibration.timer=null;
 ui.calibrate.disabled=false;
 automaticSignScore=0;
 updateCalibrationBadge();
 setStatus("Calibration 3D terminée : axes avant, latéral et vertical enregistrés.");
}

function cancelCalibration(message){
 if(calibration.timer)clearTimeout(calibration.timer);
 calibration={phase:"idle",stationary:[],drive:[],driveWeights:[],timer:null};
 ui.calibrate.disabled=false;
 updateCalibrationBadge();
 setStatus(message);
}

function startGps(){
 if(!navigator.geolocation)return;
 watchId=navigator.geolocation.watchPosition(position=>{
  if(desktopSimActive||demoTimer||journeyTimer)return;
  const {coords,timestamp}=position;
  const speed=coords.speed!=null&&Number.isFinite(coords.speed)?Math.max(0,coords.speed):gpsSpeedMs;
  if(lastGps.timestamp&&lastGps.speed!=null){
   const dt=Math.max(.2,Math.min(5,(timestamp-lastGps.timestamp)/1000));
   rawGpsAcceleration=clamp((speed-lastGps.speed)/dt,-4,4);
   gpsAcceleration=lowPass(gpsAcceleration,rawGpsAcceleration,.48);
  }else rawGpsAcceleration=0;
  lastGpsUpdateAt=performance.now();
  gpsSpeedMs=speed;
  speedKmh=lowPass(speedKmh,speed*3.6,.42);

  const heading=coords.heading;
  if(lastGps.timestamp&&lastGps.heading!=null&&heading!=null&&Number.isFinite(heading)&&speed>2){
   const dt=Math.max(.2,Math.min(5,(timestamp-lastGps.timestamp)/1000));
   const signedRate=wrapDegrees(heading-lastGps.heading)/dt;
   gpsHeadingRateSigned=lowPass(gpsHeadingRateSigned,clamp(signedRate,-120,120),.30);
   gpsHeadingRate=lowPass(gpsHeadingRate,Math.abs(gpsHeadingRateSigned),.30);
  }else{
   gpsHeadingRateSigned=lowPass(gpsHeadingRateSigned,0,.08);
   gpsHeadingRate=lowPass(gpsHeadingRate,0,.08);
  }
  lastGps={timestamp,speed,heading:heading!=null&&Number.isFinite(heading)?heading:lastGps.heading};
 },()=>setStatus("GPS indisponible : les capteurs Motion restent actifs."),{enableHighAccuracy:true,maximumAge:250,timeout:10000});
}

function startDemo(){
 if(desktopSimActive)setDesktopSimulation(false,false);
 if(demoTimer){clearInterval(demoTimer);demoTimer=null;if(ui.demo)ui.demo.textContent="Simulation libre";setStatus("Simulation arrêtée.");return;}
 if(journeyTimer){clearInterval(journeyTimer);journeyTimer=null;}
 let phase=0;if(ui.demo)ui.demo.textContent="Arrêter la simulation";setStatus("Simulation low latency active.");
 demoTimer=setInterval(()=>{
  phase+=.075;speedKmh=Math.max(0,50+48*Math.sin(phase*.22));
  smoothed.accel=clamp((Math.sin(phase)+.15)*.72);smoothed.brake=clamp((-Math.sin(phase*.51)-.34)*.86);smoothed.turn=clamp(Math.abs(Math.sin(phase*.37))*.92);signedTurn=Math.sin(phase*.37)*smoothed.turn;
 },100);
}

function startJourney(){
 if(desktopSimActive)setDesktopSimulation(false,false);
 if(journeyTimer){clearInterval(journeyTimer);journeyTimer=null;if(ui.journey)ui.journey.textContent="Scénario trajet complet";setStatus("Scénario arrêté.");return;}
 if(demoTimer){clearInterval(demoTimer);demoTimer=null;if(ui.demo)ui.demo.textContent="Simulation libre";}
 let elapsed=0;if(ui.journey)ui.journey.textContent="Arrêter le scénario";setStatus("Scénario : ville → campagne → autoroute → freinage.");
 journeyTimer=setInterval(()=>{
  elapsed+=.1;let targetSpeed=0,acceleration=0,brake=0,turn=0;
  if(elapsed<8){targetSpeed=0;roadMode="city";}
  else if(elapsed<26){targetSpeed=(elapsed-8)/18*50;acceleration=.48;roadMode="city";}
  else if(elapsed<45){targetSpeed=50;turn=.10;}
  else if(elapsed<62){targetSpeed=50+(elapsed-45)/17*30;acceleration=.38;roadMode="country";}
  else if(elapsed<82){targetSpeed=80;turn=.32;}
  else if(elapsed<102){targetSpeed=80+(elapsed-82)/20*50;acceleration=.43;roadMode="highway";}
  else if(elapsed<126){targetSpeed=130;}
  else if(elapsed<138){targetSpeed=130-(elapsed-126)/12*125;brake=.76;}
  else{targetSpeed=0;clearInterval(journeyTimer);journeyTimer=null;if(ui.journey)ui.journey.textContent="Scénario trajet complet";setStatus("Scénario terminé.");}
  applyRoadMode(roadMode);speedKmh=Math.max(0,targetSpeed);
  smoothed.accel=lowPass(smoothed.accel,acceleration,.25);smoothed.brake=lowPass(smoothed.brake,brake,.25);smoothed.turn=lowPass(smoothed.turn,turn,.25);signedTurn=lowPass(signedTurn,turn,.22);
 },100);
}

function toggleFixedMix(){
 fixedMixMode=!fixedMixMode;
 if(ui.quality)ui.quality.textContent=fixedMixMode?"Revenir à l’adaptatif":"Mix fixe A/B";
 ui.audioMode.textContent=fixedMixMode?"Mix fixe":"Adaptatif low latency";
 if(fixedMixMode){requestTargetScene("chorus");setStatus("Mix fixe : niveaux stables pour contrôler la qualité audio.");}
 else{candidateSince=0;setStatus("Mix adaptatif low latency réactivé.");}
 applyBusMix(true);
}

function toggleLogging(){
 sensorLogging=!sensorLogging;
 ui.record.textContent=sensorLogging?"Arrêter l’enregistrement":"Enregistrer capteurs";
 if(sensorLogging){lastLogAt=0;setStatus("Journal capteurs actif (5 mesures/s). ");}
 else setStatus(`${sensorLog.length} mesures capteurs enregistrées.`);
}

function downloadSensorLog(){
 if(!sensorLog.length)return;
 const headers=Object.keys(sensorLog[0]);
 const lines=[headers.join(";"),...sensorLog.map(row=>headers.map(key=>String(row[key]).replaceAll(";",",")).join(";"))];
 const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;link.download=`drivepulse-v9-8-thrust-sensors-${new Date().toISOString().replaceAll(":","-")}.csv`;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function start(){
 if(running)return;
 if(!library?.tracks?.length){
  setStatus("Bibliothèque vide : ajoute un nouveau morceau avant de démarrer le moteur musical.");
  return;
 }
 try{
  generation++;setStatus("Chargement des stems complets synchronisés…");
  createAudioGraph();
  const resumePromise=audioCtx.resume();
  const permissionPromise=desktopSimActive?Promise.resolve(false):requestMotionPermission();
  await loadLibrary();
  await activateTrackMetadata(currentTrackId);
  await resumePromise;
  await Promise.all([loadScene("intro",currentTrackId),loadScene("groove",currentTrackId)]);
  const motionGranted=await permissionPromise;
  loadSavedCalibration();

  running=true;currentScene="intro";targetScene="intro";candidateScene="intro";candidateSince=performance.now();
  trackStartedAt=performance.now();
  const startAt=audioCtx.currentTime+.28;
  activeGroup=startSceneGroup("intro",startAt,0,.025);
  currentPhaseStart=startAt;nextLoopTime=startAt+(isContinuousTrack()?Math.max(1,TRACK_DURATION-TRACK_CROSSFADE):LOOP_DURATION);
  schedulerTimer=setInterval(scheduler,40);updateTimer=setInterval(updateEngine,ENGINE_INTERVAL);
  if(motionGranted)window.addEventListener("devicemotion",handleMotion,{passive:true});
  startGps();
  prefetchAllAudio();
  prepareNextTrackForEnd(currentTrackId);

  ui.start.disabled=true;ui.calibrate.disabled=desktopSimActive||!motionGranted;ui.stop.disabled=false;if(ui.demo)ui.demo.disabled=false;if(ui.journey)ui.journey.disabled=false;
  if(ui.quality)ui.quality.disabled=false;ui.record.disabled=false;ui.downloadLog.disabled=sensorLog.length===0;
  setStatus(desktopSimActive?"V9.8 actif : simulateur PC prêt, utilise les curseurs ou le clavier.":(motionGranted?(sensorCalibration.calibrated?"V9.8 active : lecture continue et calibration 3D prêtes.":"V9.8 active : effectue la calibration 3D."):"Audio actif. Capteurs Motion indisponibles."));
  applyBusMix(true);updateEngine();
 }catch(error){console.error(error);setStatus(error.message||"Impossible de démarrer DrivePulse V9.8.");stop(false);}
}

function stop(updateStatus=true){
 generation++;running=false;
 if(calibration.timer)clearTimeout(calibration.timer);
 calibration.phase="idle";
 [schedulerTimer,updateTimer,demoTimer,journeyTimer].forEach(timer=>{if(timer)clearInterval(timer);});
 schedulerTimer=updateTimer=demoTimer=journeyTimer=null;
 if(watchId!=null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;
 window.removeEventListener("devicemotion",handleMotion);
 activeGroups.forEach(group=>cancelFutureGroup(group));activeGroups.clear();
 if(audioCtx)audioCtx.close().catch(()=>{});
 audioCtx=masterGain=masterFilter=masterCompressor=swirlInput=swirlReturnGain=swirlPanner=swirlDelay=swirlFeedback=swirlStemGain=null;
 thrustBassFilter=thrustAirFilter=thrustBassGain=thrustAirGain=null;
 swirlSendNodes.clear();busNodes.clear();sceneCache.clear();sceneLoads.clear();sceneAccess.clear();activeGroup=pendingTransition=nextLoopGroup=pendingTrackSwitch=null;clearPreparedEndTrack();
 swirlEnvelope=0;swirlHoldUntil=0;thrustEnvelope=0;thrustHoldUntil=0;thrustCooldownUntil=0;thrustTriggerLevel=0;thrustJerk=0;previousAccelForThrust=0;signedTurn=0;
 fastImuAccel=slowGpsAccel=accelerationTarget=fastImuBrake=slowGpsBrake=0;
 turnImuEvidence=turnGyroEvidence=turnGpsEvidence=turnConfidence=0;
 imuLongitudinalBias=imuLongitudinalCorrected=imuLongitudinalFast=0;lastMotionAt=performance.now();
 BUSES.forEach(bus=>setAgentVisualState(bus.id,"inactive"));
 setAgentVisualState("swirl","inactive");
 setAgentVisualState("thrust","inactive");
 if(sensorLogging){sensorLogging=false;ui.record.textContent="Enregistrer capteurs";}
 ui.start.disabled=!library?.tracks?.length;ui.calibrate.disabled=true;ui.stop.disabled=true;ui.record.disabled=true;
 if(ui.demo){ui.demo.disabled=true;ui.demo.textContent="Simulation libre";}
 if(ui.journey){ui.journey.disabled=true;ui.journey.textContent="Scénario trajet complet";}
 if(ui.quality){ui.quality.disabled=true;ui.quality.textContent="Mix fixe A/B";}
 fixedMixMode=false;
 updateCalibrationBadge();if(updateStatus)setStatus("Arrêté.");
}

function applyRoadMode(mode){
 if(!ROAD_PROFILES[mode])return;roadMode=mode;localStorage.setItem("drivepulse-road-mode",mode);
 document.querySelectorAll(".road-mode").forEach(button=>button.classList.toggle("active",button.dataset.roadMode===mode));
 ui.road.textContent=ROAD_PROFILES[mode].label;ui.roadHelp.textContent=ROAD_PROFILES[mode].help;
}

const HELP_CONTENT={
 responsiveness:{title:"Réactivité musicale",text:"Les volumes réagissent désormais immédiatement, au prochain temps ou à la prochaine mesure. Ce réglage agit surtout sur la durée de validation avant un changement de scène.",recommendation:"Conseil : 1,0. Monte vers 1,3 si les scènes changent encore trop lentement."},
 accelSensitivity:{title:"Sensibilité accélération",text:"Amplifie la fusion V9.8 : l’IMU du téléphone déclenche l’effet immédiatement à environ 60 Hz, puis le GPS confirme et prolonge l’accélération sans bloquer l’attaque.",recommendation:"Conseil : commence à 1,0 après la calibration 3D ; 1,15 donne un effet plus démonstratif."},
 turnSensitivity:{title:"Sensibilité virage",text:"SWIRL exige maintenant une validation par le gyroscope ou le changement de cap GPS. L’accélération latérale sert de renfort, mais ne peut plus ouvrir seule l’effet sur une bosse.",recommendation:"Conseil : 1,0 ; monte vers 1,15 uniquement si les vrais virages restent trop discrets."}
};
function openHelp(key){const item=HELP_CONTENT[key];if(!item)return;ui.helpTitle.textContent=item.title;ui.helpText.textContent=item.text;ui.helpRecommendation.textContent=item.recommendation;ui.helpModal.hidden=false;}
function closeHelp(){ui.helpModal.hidden=true;}
function updateSettingValues(){ui.responsivenessValue.value=Number(ui.responsiveness.value).toFixed(1);ui.accelSensitivityValue.value=Number(ui.accelSensitivity.value).toFixed(2);ui.turnSensitivityValue.value=Number(ui.turnSensitivity.value).toFixed(2);}

renderAgents();loadSavedCalibration();applyRoadMode(roadMode);updateSectionTimeline();updateSettingValues();updateCalibrationBadge();readDesktopControls();updateDesktopSimulatorUi();
loadLibrary()
 .then(async()=>{
  if(library.tracks.length){
   await activateTrackMetadata(currentTrackId);
   setStatus("Prêt — V9.8 : simulateur ordinateur activé par défaut.");
  }else{
   renderAgents();
   setStatus("Bibliothèque vide — les anciens morceaux ont été retirés. En attente de nouveaux stems.");
  }
 })
 .catch(error=>setStatus(error.message));
ui.start.addEventListener("click",start);ui.stop.addEventListener("click",()=>stop(true));ui.calibrate.addEventListener("click",beginCalibration);
if(ui.demo)ui.demo.addEventListener("click",startDemo);if(ui.journey)ui.journey.addEventListener("click",startJourney);if(ui.quality)ui.quality.addEventListener("click",toggleFixedMix);
ui.desktopSimBtn.addEventListener("click",()=>setDesktopSimulation(!desktopSimActive));
[ui.simSpeed,ui.simAccel,ui.simBrake,ui.simTurn].forEach(input=>input.addEventListener("input",()=>{readDesktopControls();updateDesktopControlLabels();}));
ui.simLinkPedals.addEventListener("change",()=>{desktopSimLastUpdate=performance.now();updateDesktopControlLabels();});
ui.simResetSignals.addEventListener("click",releaseDesktopSignals);
document.querySelectorAll("[data-sim-preset]").forEach(button=>button.addEventListener("click",()=>applyDesktopPreset(button.dataset.simPreset)));
ui.record.addEventListener("click",toggleLogging);ui.downloadLog.addEventListener("click",downloadSensorLog);
ui.trackSelect.addEventListener("change",()=>requestTrackSwitch(ui.trackSelect.value,"select"));
ui.previousTrack.addEventListener("click",()=>requestTrackSwitch(nextTrackId(-1),"previous"));
ui.nextTrack.addEventListener("click",()=>requestTrackSwitch(nextTrackId(1),"next"));
document.querySelectorAll(".road-mode").forEach(button=>button.addEventListener("click",()=>applyRoadMode(button.dataset.roadMode)));
document.querySelectorAll(".help-btn").forEach(button=>button.addEventListener("click",()=>openHelp(button.dataset.help)));
ui.closeHelp.addEventListener("click",closeHelp);ui.helpModal.addEventListener("click",event=>{if(event.target===ui.helpModal)closeHelp();});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"){closeHelp();return;}
 if(!desktopSimActive||event.target?.matches?.("input,select,textarea"))return;
 const key=event.key.toLowerCase();
 if(key==="w"||event.key==="ArrowUp")desktopKeys.accel=true;
 else if(key==="s"||event.key==="ArrowDown"||event.code==="Space")desktopKeys.brake=true;
 else if(key==="a"||event.key==="ArrowLeft")desktopKeys.left=true;
 else if(key==="d"||event.key==="ArrowRight")desktopKeys.right=true;
 else if(key==="r"){releaseDesktopSignals();return;}
 else return;
 event.preventDefault();
});
document.addEventListener("keyup",event=>{
 if(!desktopSimActive)return;
 const key=event.key.toLowerCase();
 if(key==="w"||event.key==="ArrowUp")desktopKeys.accel=false;
 else if(key==="s"||event.key==="ArrowDown"||event.code==="Space")desktopKeys.brake=false;
 else if(key==="a"||event.key==="ArrowLeft")desktopKeys.left=false;
 else if(key==="d"||event.key==="ArrowRight")desktopKeys.right=false;
 else return;
 event.preventDefault();
});
[ui.responsiveness,ui.accelSensitivity,ui.turnSensitivity].forEach(input=>input.addEventListener("input",updateSettingValues));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js?v=9.8"));
