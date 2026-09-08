import * as THREE from './vendor/three.module.js';

const host = document.querySelector('.header-art');
const materials = {};
function material(color) {
  return materials[color] ||= new THREE.MeshStandardMaterial({ color, roughness:0.38, metalness:0.03 });
}
function ellipsoid(parent, color, position, scale) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1,32,24),material(color));
  mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
}
function stroke(parent, points, color, radius=.025) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,8,false),material(color));
  parent.add(mesh); return mesh;
}
function friend(cat) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin=cat?'#fff8ec':'#e8c784', shirt=cat?'#e94f58':'#e991bc';
  ellipsoid(body,shirt,[0,.74,0],[.48,.52,.3]);
  if(!cat) {
    ellipsoid(body,'#fff8ec',[0,.69,.283],[.19,.35,.04]);
    stroke(body,[[-.2,.49,.3],[-.27,.47,.3],[-.3,.55,.3]],'#694c49');
    stroke(body,[[.2,.49,.3],[.27,.47,.3],[.3,.55,.3]],'#694c49');
  }
  const head = new THREE.Group(); head.position.y=1.35; body.add(head);
  ellipsoid(head,skin,[0,0,0],[.61,.48,.37]);
  if(cat) {
    for(const x of [-.4,.4]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.22,.42,3),material(x>0?'#8b887a':skin));
      ear.position.set(x,.37,-.03); ear.rotation.z=x>0?-.22:.22; head.add(ear);
    }
    ellipsoid(head,'#8b887a',[.31,.28,.15],[.24,.18,.2]);
  } else {
    for(const x of [-.62,.62]) ellipsoid(head,skin,[x,-.04,-.015],[.26,.26,.18]);
    ellipsoid(head,'#e991bc',[0,.43,-.02],[.48,.09,.34]);
    ellipsoid(head,'#e991bc',[-.06,.58,-.03],[.34,.25,.29]);
    for(const x of [-.22,-.08,.06,.2]) ellipsoid(head,'#774853',[x,.51,.263],[.022,.045,.016]);
  }
  for(const x of [-.22,.22]) {
    ellipsoid(head,'#302d2b',[x,.02,.346],[.046,.058,.027]);
    ellipsoid(head,'#ffffff',[x-.012,.043,.368],[.013,.014,.008]);
    ellipsoid(head,'#edaca5',[x*1.5,-.095,.3],[.076,.036,.017]);
  }
  if(!cat) ellipsoid(head,'#302d2b',[0,-.075,.376],[.065,.04,.025]);
  stroke(head,[[-.1,-.14,.357],[0,-.19,.385],[.1,-.14,.357]],'#302d2b',.02);
  const arms=[],legs=[];
  for(const side of [-1,1]) {
    const arm = new THREE.Group(); arm.position.set(side*.39,.97,0); body.add(arm);
    ellipsoid(arm,shirt,[side*.13,-.12,0],[.17,.25,.19]);
    ellipsoid(arm,skin,[side*.19,-.31,.02],[.15,.17,.16]); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(side*.23,.35,0); root.add(leg);
    ellipsoid(leg,cat?'#608391':skin,[0,-.12,0],[.19,.23,.23]);
    ellipsoid(leg,cat?'#38474b':'#b58c51',[0,-.27,.12],[.23,.12,.28]); legs.push(leg);
  }
  return {root,body,head,arms,legs};
}

let renderer;
try {
  if(!host)throw new Error('Missing .header-art host');
  renderer = new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.addEventListener('webglcontextlost',()=>{
    renderer.setAnimationLoop(null);
    host.classList.remove('is-3d');
    host.querySelector('.friends-toggle')?.remove();
  });
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.1,50);
  scene.add(new THREE.HemisphereLight('#fff9ee','#7e8f78',3));
  const light=new THREE.DirectionalLight('#ffffff',4); light.position.set(-3,5,4); scene.add(light);
  const pairRoot=new THREE.Group();
  const pairXOffset=6.5;
  pairRoot.position.x=pairXOffset;
  scene.add(pairRoot);
  const pair=[friend(false),friend(true)];

  pair.forEach((f,i)=>{
    f.root.position.x = i ? 1.05 : -1.05;
    f.root.scale.set(1.7,3.0,2.0);
    pairRoot.add(f.root);
  });

  const characterBounds = new THREE.Box3();
  const characterCenter = new THREE.Vector3();
  const characterSize = new THREE.Vector3();
  function resizeScene() {
    const w=host.clientWidth,h=host.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    characterBounds.makeEmpty();
    pair.forEach(f=>characterBounds.expandByObject(f.root));
    characterBounds.getCenter(characterCenter);
    characterBounds.getSize(characterSize);
    const halfFov=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
    const heightDistance=characterSize.y/(2*halfFov*.9);
    const widthDistance=characterSize.x/(2*halfFov*camera.aspect*.9);
    const distance=Math.max(heightDistance,widthDistance);
    camera.position.set(characterCenter.x-pairXOffset,characterCenter.y,characterCenter.z+distance);
    camera.lookAt(characterCenter.x-pairXOffset,characterCenter.y,characterCenter.z);
    camera.updateProjectionMatrix();
  }
  
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let dancing=!reduced.matches, visible=true, phase=0, last=0, pointer=0;
  const button=document.createElement('button'); button.className='friends-toggle'; button.type='button';
  function label(){button.textContent=dancing?'Ⅱ':'▶';button.title=dancing?'暂停跳舞':'一起跳舞';button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(dancing));}
  label(); host.append(button); button.onclick=()=>{dancing=!dancing;label();};
  reduced.addEventListener('change',e=>{dancing=!e.matches;label();});
  host.addEventListener('pointermove',e=>{const rect=host.getBoundingClientRect();pointer=((e.clientX-rect.left)/rect.width-.5)*.45;});
  host.addEventListener('pointerleave',()=>{pointer=0;});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
  new ResizeObserver(resizeScene).observe(host);
  resizeScene();
  renderer.render(scene,camera);
  host.classList.add('is-3d');
  renderer.setAnimationLoop(ms=>{
    const dt=Math.min((ms-last)/1000,.05);last=ms;
    if(!visible||document.hidden)return;
    if(dancing)phase+=dt*4;
    pair.forEach((f,i)=>{
      const p=phase+i*.6;
      f.body.rotation.z=Math.sin(p)*.095;
      f.root.position.y=Math.abs(Math.sin(p))*.085;
      f.root.rotation.y=pointer+Math.sin(p*.5)*.12;
      f.head.rotation.z=Math.sin(p+.3)*.075;
      f.arms.forEach((a,j)=>{a.rotation.z=(j?1:-1)*(.45+Math.sin(p+j)*.45);a.rotation.x=Math.sin(p+j)*.28;});
      f.legs.forEach((l,j)=>{l.rotation.x=Math.sin(p+j*Math.PI)*.28;});
    });
    renderer.render(scene,camera);
  });
} catch(error) {
  renderer?.setAnimationLoop(null);
  renderer?.domElement.remove();
  host?.classList.remove('is-3d');
  host?.querySelector('.friends-toggle')?.remove();
  console.warn('3D unavailable; keeping the original character illustration.',error);
}
