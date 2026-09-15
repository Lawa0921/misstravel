/** Resolve once on success/error/timeout; never replace a good picture with a failed one. */
export function waitForPhoto(image: HTMLImageElement, timeout = 8000): Promise<boolean> {
  if (image.complete) return Promise.resolve(image.naturalWidth > 0);
  return new Promise(resolve => {
    let settled=false;
    const finish=(ok:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);image.removeEventListener('load',loaded);image.removeEventListener('error',failed);resolve(ok);};
    const loaded=()=>finish(image.naturalWidth>0),failed=()=>finish(false);
    const timer=setTimeout(failed,timeout);
    image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
    image.decode().then(loaded).catch(()=>{if(image.complete)failed();});
  });
}
