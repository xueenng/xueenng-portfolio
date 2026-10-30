/* Panoramic illustration viewer: preserves painted architecture without spherical warping. */
(function (root) {
  'use strict';
  var TAU=Math.PI*2;
  function wrapYaw(yaw){return ((yaw+Math.PI)%TAU+TAU)%TAU-Math.PI;}
  function imageSize(width,height){var h=Math.max(height,width/2)*1.15;return {width:h*2,height:h};}
  function clampPitch(pitch,width,height){var size=imageSize(width,height),limit=(size.height-height)/size.height*Math.PI/2;return Math.max(-limit,Math.min(limit,pitch));}
  function projectPoint(point,view,width,height){var size=imageSize(width,height),delta=wrapYaw(point.yaw-view.yaw);
    var x=width/2+delta/TAU*size.width,y=height/2-(point.pitch-view.pitch)/Math.PI*size.height;
    return {x:x,y:y,visible:Math.abs(delta)<Math.PI-.01&&x>=12&&x<=width-12&&y>=12&&y<=height-12};
  }
  function mount(host,options){options=options||{};var surface=document.createElement('div');surface.className='cx-panorama';surface.tabIndex=0;
    surface.setAttribute('role','img');surface.setAttribute('aria-label','Illustrated panoramic view. Drag to look around or use arrow keys.');host.appendChild(surface);
    var view={yaw:0,pitch:0},disposed=false,loading=0,dragging=false,previous,lookEnabled=true;
    host.dataset.renderer='panorama';
    function draw(){if(disposed)return;var r=host.getBoundingClientRect();if(r.width<1||r.height<1)return;var size=imageSize(r.width,r.height);view.pitch=clampPitch(view.pitch,r.width,r.height);
      surface.style.backgroundSize=size.width+'px '+size.height+'px';
      surface.style.backgroundPosition=(r.width/2-size.width/2-view.yaw/TAU*size.width)+'px '+(r.height/2-size.height/2+view.pitch/Math.PI*size.height)+'px';
      host.dataset.yaw=view.yaw.toFixed(3);host.dataset.pitch=view.pitch.toFixed(3);
      if(options.onViewChange)options.onViewChange(Object.assign({},view));
    }
    function setView(next){if(Number.isFinite(next.yaw))view.yaw=wrapYaw(next.yaw);if(Number.isFinite(next.pitch))view.pitch=Math.max(-.65,Math.min(.65,next.pitch));draw();}
    function setImage(src,initial){var token=++loading;host.dataset.loading='true';if(initial)setView(initial);var image=new Image();
      image.onload=function(){if(disposed||token!==loading)return;surface.style.backgroundImage='url("'+src+'")';host.dataset.loading='false';draw();};
      image.onerror=function(){if(disposed||token!==loading)return;host.dataset.loading='error';};image.src=src;
    }
    function setLookEnabled(enabled){lookEnabled=!!enabled;dragging=false;surface.classList.remove('is-dragging');surface.tabIndex=lookEnabled?0:-1;surface.setAttribute('aria-label',lookEnabled?'Illustrated panoramic view. Drag to look around or use arrow keys.':'Painted castle room. Select its marked objects to explore.');host.dataset.lookMode=lookEnabled?'panorama':'fixed';}
    function down(e){if(!lookEnabled||e.button!==0)return;dragging=true;previous=[e.clientX,e.clientY];surface.setPointerCapture(e.pointerId);surface.classList.add('is-dragging');}
    function move(e){if(!dragging)return;var dx=e.clientX-previous[0],dy=e.clientY-previous[1];previous=[e.clientX,e.clientY];var r=host.getBoundingClientRect(),size=imageSize(r.width,r.height);setView({yaw:view.yaw-dx/size.width*TAU,pitch:view.pitch+dy/size.height*Math.PI});}
    function up(){dragging=false;surface.classList.remove('is-dragging');}
    function key(e){var offsets={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};if(!lookEnabled||!offsets[e.key])return;e.preventDefault();e.stopPropagation();setView({yaw:view.yaw+offsets[e.key][0],pitch:view.pitch+offsets[e.key][1]});}
    surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);surface.addEventListener('keydown',key);
    var resize=new ResizeObserver(draw);resize.observe(host);if(options.image)setImage(options.image,options.view||view);
    return {setImage:setImage,setView:setView,setLookEnabled:setLookEnabled,getView:function(){return Object.assign({},view);},project:function(p){var r=host.getBoundingClientRect();return projectPoint(p,view,r.width,r.height);},
      destroy:function(){if(disposed)return;disposed=true;loading++;resize.disconnect();surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);surface.removeEventListener('pointercancel',up);surface.removeEventListener('keydown',key);surface.remove();}};
  }
  var api={mount:mount,projectPoint:projectPoint,wrapYaw:wrapYaw,clampPitch:clampPitch};if(typeof module==='object'&&module.exports)module.exports=api;else root.PORTFOLIO_CASTLE_PANORAMA=api;
})(typeof window!=='undefined'?window:globalThis);
