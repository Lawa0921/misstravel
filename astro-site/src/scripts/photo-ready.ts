export type PhotoReadiness = 'ready' | 'error' | 'timeout';
/** A slow request is distinct from a failed image. Always remove listeners on settlement. */
export function waitForPhoto(image: HTMLImageElement, timeout = 8000): Promise<PhotoReadiness> {
  if (image.complete) return Promise.resolve(image.naturalWidth > 0 ? 'ready' : 'error');
  return new Promise(resolve => {
    let settled=false;
    const finish=(result:PhotoReadiness)=>{if(settled)return;settled=true;clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);resolve(result);};
    const loaded=()=>finish(image.naturalWidth>0?'ready':'error'),failed=()=>finish('error');
    const timer=setTimeout(()=>finish('timeout'),timeout);
    image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
    image.decode().then(loaded).catch(()=>{if(image.complete)failed();});
  });
}
