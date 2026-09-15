export interface PhotoGestureOptions {
  onStart?: () => void;
  onMove: (offset: number) => void;
  onEnd: (direction: -1 | 0 | 1) => void;
  disabled?: () => boolean;
}
/** Horizontal intent only: native vertical scrolling and pinch zoom remain available. */
export function attachPhotoGestures(surface: HTMLElement, options: PhotoGestureOptions): void {
  let pointer: number | null = null;
  let startX=0, startY=0, lastX=0, started=0, dragging=false, frame=0, suppressClick=false;
  const reset = (direction: -1|0|1) => {
    if(pointer===null)return;
    const id=pointer;pointer=null;cancelAnimationFrame(frame);frame=0;
    const wasDragging=dragging;dragging=false;
    if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);
    if(wasDragging){options.onEnd(direction);suppressClick=true;setTimeout(()=>suppressClick=false,0);}
  };
  surface.addEventListener('pointerdown',event=>{
    if(!event.isPrimary){reset(0);return;}
    if(event.button!==0 || options.disabled?.() || (event.target as Element).closest('button,a,input'))return;
    pointer=event.pointerId;startX=lastX=event.clientX;startY=event.clientY;started=performance.now();dragging=false;
  });
  surface.addEventListener('pointermove',event=>{
    if(event.pointerId!==pointer)return;
    const dx=event.clientX-startX,dy=event.clientY-startY;lastX=event.clientX;
    if(!dragging){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){pointer=null;return;}
      if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.2)return;
      dragging=true;surface.setPointerCapture(event.pointerId);options.onStart?.();
    }
    if(event.cancelable)event.preventDefault();
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;const limit=surface.clientWidth*.45;options.onMove(Math.max(-limit,Math.min(limit,lastX-startX)));});
  });
  surface.addEventListener('pointerup',event=>{
    if(event.pointerId!==pointer)return;
    const dx=event.clientX-startX,elapsed=Math.max(performance.now()-started,1);
    const commit=dragging&&(Math.abs(dx)>Math.min(70,surface.clientWidth*.18)||(Math.abs(dx)>24&&Math.abs(dx)/elapsed>.5));
    reset(commit?(dx<0?1:-1):0);
  });
  surface.addEventListener('pointercancel',()=>reset(0));
  // Touch starts with implicit capture on the image. Its bubbled capture loss
  // during transfer to the surface must not cancel the newly claimed drag.
  surface.addEventListener('lostpointercapture',event=>{if(event.target===surface&&event.pointerId===pointer)reset(0);});
  surface.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
  surface.addEventListener('dragstart',event=>event.preventDefault());
}
